import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import FormData from "form-data";

const TEMP_MAIL_DOMAIN = process?.env?.MY_DOMAIN_URL || "wudysoft.my.id";
const BASE_URL = "https://claude.ai";

function buildAuthHeaders(ctx, extra = {}) {
    const headers = {
        authority: "claude.ai",
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "anthropic-anonymous-id": ctx.anonymousId,
        "anthropic-client-platform": "web_claude_ai",
        "anthropic-client-sha": "e6d5ac949ef7d8040d371aa4d26d342f240308cb",
        "anthropic-client-version": "1.0.0",
        "anthropic-device-id": ctx.deviceId,
        "content-type": "application/json",
        origin: BASE_URL,
        referer: BASE_URL + "/",
        "user-agent": ctx.WEB_UA,
        "x-activity-session-id": ctx.activitySessionId
    };

    const cookies = Array.from(ctx.cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    if (cookies) headers["Cookie"] = cookies;

    return Object.assign(headers, extra);
}

function buildChatHeaders(ctx, extra = {}) {
    const headers = {
        authority: "claude.ai",
        accept: "*/*",
        "accept-language": "id-ID",
        "anthropic-client-platform": "android",
        "anthropic-client-app": "com.anthropic.claude",
        "anthropic-client-version": "1.260611.30",
        "anthropic-client-os-version": "36",
        "anthropic-device-id": ctx.deviceId,
        "content-type": "application/json; charset=UTF8",
        origin: BASE_URL,
        referer: BASE_URL + "/",
        "user-agent": "Claude com.anthropic.claude/1.260611.30 (Android 36)",
        "accept-encoding": "gzip, deflate, br",
        priority: "u=1, i"
    };

    const cookies = Array.from(ctx.cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    if (cookies) headers["Cookie"] = cookies;

    return Object.assign(headers, extra);
}

function setCookies(ctx, raw) {
    const arr = Array.isArray(raw) ? raw : [raw];
    for (const c of arr) {
        const pair = c.split(";")[0];
        const idx = pair.indexOf("=");
        if (idx < 0) continue;
        const name = pair.slice(0, idx).trim();
        const val = pair.slice(idx + 1);
        if (name) ctx.cookies.set(name, val || "");
    }
}

async function authRequest(ctx, method, urlPath, { body = null, headers = {} } = {}) {
    let bodyBuf = body ? JSON.stringify(body) : null;
    const reqHeaders = buildAuthHeaders(ctx, {
        ...(bodyBuf ? { "Content-Length": String(Buffer.byteLength(bodyBuf)) } : {}),
        ...headers
    });

    try {
        const response = await axios({
            method,
            url: BASE_URL + urlPath,
            data: bodyBuf,
            headers: reqHeaders,
            timeout: 60000
        });
        if (response.headers["set-cookie"]) setCookies(ctx, response.headers["set-cookie"]);
        return response.data;
    } catch (err) {
        if (err.response?.headers?.["set-cookie"]) setCookies(ctx, err.response.headers["set-cookie"]);
        throw new Error(
            err.response ? `HTTP_${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message
        );
    }
}

async function chatRequest(ctx, method, urlPath, { body = null, headers = {} } = {}) {
    let bodyBuf = body ? JSON.stringify(body) : null;
    const reqHeaders = buildChatHeaders(ctx, {
        ...(bodyBuf ? { "Content-Length": String(Buffer.byteLength(bodyBuf)) } : {}),
        ...headers
    });

    try {
        const response = await axios({
            method,
            url: BASE_URL + urlPath,
            data: bodyBuf,
            headers: reqHeaders,
            timeout: 60000
        });
        if (response.headers["set-cookie"]) setCookies(ctx, response.headers["set-cookie"]);
        return response.data;
    } catch (err) {
        if (err.response?.headers?.["set-cookie"]) setCookies(ctx, err.response.headers["set-cookie"]);
        const errorData = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        throw new Error(`HTTP_${err.response?.status || "UNKNOWN"}: ${errorData}`);
    }
}

async function streamRequest(ctx, urlPath, body, extraHeaders = {}) {
    const bodyStr = JSON.stringify(body);
    const headers = buildChatHeaders(ctx, {
        accept: "text/event-stream",
        "Content-Type": "application/json; charset=UTF8",
        "Content-Length": Buffer.byteLength(bodyStr),
        ...extraHeaders
    });

    try {
        const response = await axios({
            method: "POST",
            url: BASE_URL + urlPath,
            data: bodyStr,
            headers,
            responseType: "stream",
            timeout: 120000
        });

        if (response.headers["set-cookie"]) setCookies(ctx, response.headers["set-cookie"]);
        return response.data;
    } catch (err) {
        const errorData = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        throw new Error(`Stream HTTP_${err.response?.status || "UNKNOWN"}: ${errorData}`);
    }
}

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf",
        ".txt": "text/plain", ".csv": "text/csv", ".json": "application/json",
        ".md": "text/markdown", ".html": "text/html", ".css": "text/css",
        ".js": "application/javascript", ".py": "text/x-python",
        ".java": "text/x-java", ".cpp": "text/x-c++src", ".c": "text/x-c",
        ".xml": "application/xml", ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
    return mimeTypes[ext] || "application/octet-stream";
}

async function uploadFile(ctx, orgId, convId, fileInput) {
    let fileBuffer, fileName, mimeType;

    if (typeof fileInput === "string") {
        fileBuffer = fs.readFileSync(fileInput);
        fileName = path.basename(fileInput);
        mimeType = getMimeType(fileInput);
    } else if (Buffer.isBuffer(fileInput)) {
        fileBuffer = fileInput;
        fileName = `upload_${Date.now()}.bin`;
        mimeType = "application/octet-stream";
    } else if (typeof fileInput === "object" && fileInput !== null) {
        if (!fileInput.buffer || !Buffer.isBuffer(fileInput.buffer)) {
            throw new Error("Object file harus memiliki properti 'buffer' yang berupa Buffer");
        }
        fileBuffer = fileInput.buffer;
        fileName = fileInput.fileName || fileInput.name || `upload_${Date.now()}.bin`;
        mimeType = fileInput.mimeType || fileInput.type || getMimeType(fileName);
    } else {
        throw new Error("Input file tidak valid. Gunakan string path, Buffer, atau object");
    }

    const formData = new FormData();
    formData.append("file", fileBuffer, { filename: fileName, contentType: mimeType });

    const url = `/api/organizations/${orgId}/conversations/${convId}/wiggle/upload-file`;
    const headers = buildChatHeaders(ctx, { ...formData.getHeaders() });

    try {
        const response = await axios({
            method: "POST",
            url: BASE_URL + url,
            data: formData,
            headers: headers,
            timeout: 120000
        });

        if (response.headers["set-cookie"]) setCookies(ctx, response.headers["set-cookie"]);

        const fileData = response.data;
        return {
            uuid: fileData.uuid,
            fileName: fileData.file_name,
            sanitized_name: fileData.sanitized_name,
            file_kind: fileData.file_kind,
            size_bytes: fileData.size_bytes
        };
    } catch (err) {
        const errorData = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        throw new Error(`Upload HTTP_${err.response?.status || "UNKNOWN"}: ${errorData}`);
    }
}

async function getArkoseToken(ctx) {
    const esyncValue = String(Math.floor(Date.now() / 1e3) - 1e5);
    const r = () => crypto.randomBytes(32).toString("base64");
    const params = new URLSearchParams({
        c: `${r()}==${r()}==${r()}==${r()}`,
        public_key: "EEA5F558-D6AC-4C03-B678-AABF639EE69A",
        site: BASE_URL,
        userbrowser: ctx.WEB_UA,
        capi_version: "4.2.2",
        capi_mode: "lightbox",
        style_theme: "default",
        rnd: Math.random().toString()
    });

    const response = await axios({
        method: "POST",
        url: `https://a-cdn.claude.ai/fc/gt2/public_key/EEA5F558-D6AC-4C03-B678-AABF639EE69A`,
        data: params.toString(),
        headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "user-agent": ctx.WEB_UA,
            "x-ark-esync-value": esyncValue
        },
        timeout: 15000
    });
    return response.data.token;
}

async function sendMagicLink(ctx, email) {
    const res = await authRequest(ctx, "POST", "/api/auth/send_magic_link", {
        body: {
            utc_offset: ctx.utcOffset,
            email_address: email,
            locale: ctx.locale,
            source: "claude"
        }
    });
    if (!res.sent) throw new Error("Gagal mengirim magic link");
    return res;
}

async function verifyMagicLink(ctx, email, code) {
    const arkoseToken = await getArkoseToken(ctx);
    const res = await authRequest(ctx, "POST", "/api/auth/verify_magic_link", {
        body: {
            credentials: {
                method: "code",
                email_address: email,
                code: String(code)
            },
            locale: ctx.locale,
            arkose_session_token: arkoseToken,
            source: "claude"
        }
    });
    if (!res.success) throw new Error("Verifikasi kode OTP gagal.");
    const chatOrg = (res.account.memberships || []).find(m => m.organization.capabilities?.includes("chat"));
    ctx.orgId = chatOrg?.organization.uuid || res.account.memberships?.[0]?.organization.uuid || null;
    return res;
}

async function exchangeNonceForCode(ctx, nonce, encodedEmailAddress) {
    const res = await authRequest(ctx, "POST", "/api/auth/exchange_nonce_for_code", {
        body: {
            nonce,
            encoded_email_address: encodedEmailAddress,
            source: "claude"
        }
    });
    return res.code;
}

async function loginWithMagicLink(ctx, magicLinkUrl) {
    const fragment = magicLinkUrl.split("#")[1];
    if (!fragment) throw new Error("Fragment tautan login tidak ditemukan.");

    const [nonce, encodedEmail] = fragment.split(":");
    if (!nonce || !encodedEmail) throw new Error("Format fragment tautan tidak valid.");

    const email = Buffer.from(encodedEmail, "base64").toString("utf8");
    const code = await exchangeNonceForCode(ctx, nonce, encodedEmail);
    return verifyMagicLink(ctx, email, code);
}

async function waitForMagicLink(emailAddress, maxAttempts = 30, intervalMs = 3000) {
    for (let i = 0; i < maxAttempts; i++) {
        console.log(`[Auth] Polling email pasif (${i + 1}/${maxAttempts})...`);
        try {
            const response = await axios.get(`https://${TEMP_MAIL_DOMAIN}/api/mails/v9`, {
                params: { action: "message", email: emailAddress }
            });
            const messages = response.data?.data || [];
            if (messages.length > 0) {
                const content = messages[0].text_content || messages[0].html_content || "";
                const match = content.match(/https:\/\/claude.ai\/magic-link#[a-f0-9]+:[A-Za-z0-9%+=]+/);
                if (match) {
                    console.log("[Auth] Link ditemukan!");
                    return match[0];
                }
            }
        } catch (e) { /* ignore */ }
        await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error("Timeout: Tidak mendapatkan magic link dalam batas waktu.");
}

async function ensureAuth(ctx) {
    try {
        const orgs = await authRequest(ctx, "GET", "/api/organizations");
        if (orgs && orgs.length > 0) {
            ctx.orgId = orgs[0].uuid;
            return;
        }
    } catch (e) {
        console.log("[Auth] Memulai pendaftaran otomatis...");
    }

    const createRes = await axios.get(`https://${TEMP_MAIL_DOMAIN}/api/mails/v9`, {
        params: { action: "create" }
    });
    const email = createRes.data.email;
    console.log(`[Auth] Email terbuat: ${email}`);

    await sendMagicLink(ctx, email);
    const magicLinkUrl = await waitForMagicLink(email);
    await loginWithMagicLink(ctx, magicLinkUrl);
    console.log(`[Auth] Otentikasi sukses. OrgId: ${ctx.orgId}`);
}

class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.hooks = {
            beforeChat: [],
            afterChat: [],
            beforeUpload: [],
            afterUpload: []
        };
    }

    register(plugin) {
        if (!plugin.name || !plugin.execute) {
            throw new Error('Plugin must have name and execute method');
        }

        if (this.plugins.has(plugin.name)) {
            throw new Error(`Plugin ${plugin.name} already registered`);
        }

        this.plugins.set(plugin.name, plugin);

        if (plugin.hooks) {
            for (const [hook, handler] of Object.entries(plugin.hooks)) {
                if (this.hooks[hook]) {
                    this.hooks[hook].push(handler);
                }
            }
        }
    }

    get(name) {
        return this.plugins.get(name);
    }

    getAll() {
        return Array.from(this.plugins.values());
    }

    async runHook(hook, context) {
        const handlers = this.hooks[hook] || [];
        for (const handler of handlers) {
            await handler(context);
        }
    }

    listPlugins() {
        return this.getAll().map(p => ({
            name: p.name,
            description: p.description || 'No description',
            version: p.version || '5.0.0'
        }));
    }
}

class ReminderPlugin {
    constructor() {
        this.name = 'reminder';
        this.description = 'Set reminders with Claude';
        this.version = '5.0.0';
        this.reminders = new Map();
    }

    async execute(context) {
        const { args, m, sock } = context;

        if (args.length < 2) {
            return await m.reply(
                `📌 *Reminder*\n\n` +
                `Usage: .claude reminder [time] [message]\n` +
                `Example: .claude reminder 5m Call John\n\n` +
                `Time formats: 5m (minutes), 1h (hours), 1d (days)`
            );
        }

        const timeStr = args[0];
        const message = args.slice(1).join(' ');

        const timeMatch = timeStr.match(/^(\d+)([mhd])$/);
        if (!timeMatch) {
            return await m.reply('Format waktu salah! Gunakan: 5m, 1h, 1d');
        }

        const [_, value, unit] = timeMatch;
        let ms = 0;
        switch (unit) {
            case 'm': ms = parseInt(value) * 60 * 1000; break;
            case 'h': ms = parseInt(value) * 60 * 60 * 1000; break;
            case 'd': ms = parseInt(value) * 24 * 60 * 60 * 1000; break;
        }

        const reminder = {
            message,
            chat: m.chat,
            time: Date.now() + ms,
            user: m.sender
        };

        const id = Date.now().toString();
        this.reminders.set(id, reminder);

        const timeText = `${value} ${unit === 'm' ? 'menit' : unit === 'h' ? 'jam' : 'hari'}`;
        await m.reply(`Reminder set!\n Akan diingatkan dalam ${timeText}\n Pesan: ${message}`);

        setTimeout(async () => {
            const reminder = this.reminders.get(id);
            if (reminder) {
                await sock.sendMessage(reminder.chat, {
                    text: `*REMINDER*\n\n${reminder.message}\n\nDari: @${reminder.user.split('@')[0]}`,
                    mentions: [reminder.user]
                });
                this.reminders.delete(id);
            }
        }, ms);

        return { success: true, reminder };
    }
}

class SummarizePlugin {
    constructor() {
        this.name = 'summarize';
        this.description = 'Summarize text or files';
        this.version = '5.0.0';
    }

    async execute(context) {
        const { args, m, core, config } = context;

        let textToSummarize = '';

        if (m.quoted?.text) {
            textToSummarize = m.quoted.text;
        } else if (args.length > 0) {
            textToSummarize = args.join(' ');
        } else {
            return await m.reply(
                `*Summarize*\n\n` +
                `Usage: .claude summarize [text] atau reply ke pesan\n` +
                `Example: .claude summarize Teks panjang di sini...`
            );
        }

        await m.react('📝');

        const response = await core.runChat({
            prompt: `Please summarize the following text concisely. Provide key points and main ideas:\n\n${textToSummarize}`,
            model: config.model,
            thinkingMode: false
        });

        let summary = '';
        for (const block of response.content) {
            if (block.type === 'text') {
                summary += block.text + '\n\n';
            }
        }

        if (!summary.trim()) {
            return await m.reply('Gagal membuat ringkasan.');
        }

        await m.reply(`*Summary*\n\n${summary.trim()}`);
        await m.react('✅');

        return { success: true, summary };
    }
}

class TranslatePlugin {
    constructor() {
        this.name = 'translate';
        this.description = 'Translate text to another language';
        this.version = '5.0.0';
    }

    async execute(context) {
        const { args, m, core, config } = context;

        if (args.length < 2) {
            return await m.reply(
                `*Translate*\n\n` +
                `Usage: .claude translate [language] [text]\n` +
                `Example: .claude translate english Halo World\n\n` +
                `Or reply to a message: .claude translate japanese`
            );
        }

        let targetLang = args[0];
        let textToTranslate = '';

        if (m.quoted?.text) {
            textToTranslate = m.quoted.text;
            targetLang = args[0];
        } else {
            textToTranslate = args.slice(1).join(' ');
        }

        if (!textToTranslate) {
            return await m.reply('Teks yang akan diterjemahkan tidak ditemukan.');
        }

        await m.react('🌐');

        const response = await core.runChat({
            prompt: `Translate the following text to ${targetLang}. Only provide the translation, no additional text:\n\n${textToTranslate}`,
            model: config.model,
            thinkingMode: false
        });

        let translation = '';
        for (const block of response.content) {
            if (block.type === 'text') {
                translation += block.text + '\n\n';
            }
        }

        if (!translation.trim()) {
            return await m.reply('Gagal menerjemahkan.');
        }

        await m.reply(`*Translation to ${targetLang}*\n\n${translation.trim()}`);
        await m.react('✅');

        return { success: true, translation };
    }
}

class CodePlugin {
    constructor() {
        this.name = 'code';
        this.description = 'Write and execute code explanations';
        this.version = '5.0.0';
    }

    async execute(context) {
        const { args, m, core, config } = context;

        if (args.length < 2) {
            return await m.reply(
                `*Code Plugin*\n\n` +
                `Usage: .claude code [language] [code/problem]\n` +
                `Example: .claude code python print hello world\n\n` +
                `Or reply to a message with code`
            );
        }

        let language = args[0];
        let codeText = '';

        if (m.quoted?.text) {
            codeText = m.quoted.text;
            language = args[0];
        } else {
            codeText = args.slice(1).join(' ');
        }

        await m.react('💻');

        const response = await core.runChat({
            prompt: `You are an expert ${language} programmer. Analyze this code/request and provide a solution with explanation:\n\n${codeText}`,
            model: config.model,
            thinkingMode: true
        });

        let result = '';
        for (const block of response.content) {
            if (block.type === 'text') {
                result += block.text + '\n\n';
            } else if (block.type === 'thinking') {
                result += `> *💭 Thinking*\n> ${block.thinking.split('\n').map(line => line.trim() ? line : '').join('\n> ')}\n\n`;
            }
        }

        if (!result.trim()) {
            return await m.reply('Gagal memproses kode.');
        }

        await m.reply(`*Code Analysis (${language})*\n\n${result.trim()}`);
        await m.react('✅');

        return { success: true, result };
    }
}

class HelpPlugin {
    constructor() {
        this.name = 'help';
        this.description = 'Show available plugins and commands';
        this.version = '5.0.0';
    }

    async execute(context) {
        const { m, pluginManager } = context;

        const plugins = pluginManager.getAll();
        let helpText = `*Claude AI*\n\n`;

        if (plugins.length === 0) {
            helpText += 'No plugins loaded.';
        } else {
            for (const plugin of plugins) {
                helpText += `• *${plugin.name}* - ${plugin.description}\n`;
            }
        }

        helpText += `\n\n*Usage:*\n`;
        helpText += `.claude [plugin] [args]\n`;
        helpText += `.claude help - Show this message\n`;
        helpText += `.claude [text] - Chat with Claude\n`;
        helpText += `.claude [plugin] [args] - Use specific plugin\n\n`;
        helpText += `*Features:*\n`;
        helpText += `• File upload support\n`;
        helpText += `• Thinking mode\n`;
        helpText += `• Multi-Plugin system`;

        await m.reply(helpText);
        return { success: true };
    }
}

class ClaudeCore {
    constructor() {
        this.pluginManager = new PluginManager();
        this.defaultConfig = {
            model: "claude-sonnet-5",
            thinkingMode: true,
            timeout: 120000
        };

        this.registerPlugin(new HelpPlugin());
        this.registerPlugin(new ReminderPlugin());
        this.registerPlugin(new SummarizePlugin());
        this.registerPlugin(new TranslatePlugin());
        this.registerPlugin(new CodePlugin());
    }

    registerPlugin(plugin) {
        this.pluginManager.register(plugin);
    }

    async runChat(config) {
        const ctx = {
            cookies: new Map(),
            anonymousId: "claudeai.v1." + crypto.randomUUID(),
            deviceId: crypto.randomUUID(),
            activitySessionId: crypto.randomUUID(),
            orgId: null,
            convId: null,
            model: config.model || "claude-sonnet-5",
            locale: "id-ID",
            utcOffset: -420,
            WEB_UA: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36"
        };

        await ensureAuth(ctx);

        const convRes = await chatRequest(ctx, "POST",
            `/api/organizations/${ctx.orgId}/chat_conversations`, {
                body: { name: "", model: ctx.model },
                headers: { accept: "application/json" }
            }
        );
        ctx.convId = convRes.uuid;

        let fileUuids = [];
        if (config.files && config.files.length > 0) {
            for (const fileInput of config.files) {
                try {
                    const uploadedFile = await uploadFile(ctx, ctx.orgId, ctx.convId, fileInput);
                    fileUuids.push(uploadedFile.uuid);
                } catch (err) {
                    console.error(`[Chat] Gagal upload file:`, err.message);
                    throw err;
                }
            }
        }

        const body = {
            prompt: config.prompt,
            timezone: "Asia/Jakarta",
            model: ctx.model,
            attachments: [],
            files: fileUuids,
            rendering_mode: "messages",
            input_mode: "text",
            effort: config.thinkingMode ? "xhigh" : "low",
            thinking_mode: config.thinkingMode ? "auto" : "off",
            tools: [
                { name: "repl", type: "repl_v0" },
                { name: "web_search", type: "web_search_v0" }
            ]
        };

        const stream = await streamRequest(ctx,
            `/api/organizations/${ctx.orgId}/chat_conversations/${ctx.convId}/completion`,
            body, { referer: `${BASE_URL}/chat/${ctx.convId}` }
        );

        await new Promise((resolve, reject) => {
            stream.on("end", resolve);
            stream.on("error", reject);
            stream.resume();
        });

        const getUrl = `/api/organizations/${ctx.orgId}/chat_conversations/${ctx.convId}?rendering_mode=messages&render_all_mobile_tools=true&return_dangling_human_message=true&include_extracted_content=false`;

        let res = null;
        for (let i = 0; i < 5; i++) {
            res = await chatRequest(ctx, "GET", getUrl, {
                headers: { accept: "application/json" }
            });
            const messages = res.chat_messages || [];
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.sender === "assistant" && lastMsg.stop_reason === "end_turn") break;
            await new Promise(r => setTimeout(r, 1000));
        }

        const messages = res.chat_messages || [];
        const lastAssistantMsg = messages.filter(m => m.sender === "assistant").pop();

        return {
            success: true,
            conversationId: ctx.convId,
            content: lastAssistantMsg ? lastAssistantMsg.content : []
        };
    }

    async processResponse(response, m, sock) {
        let replyText = "";
        let filesToSend = [];

        if (response.content) {
            for (const block of response.content) {
                if (block.type === "text") {
                    replyText += block.text + "\n\n";
                } else if (block.type === "thinking") {
                    const formattedThinking = block.thinking
                        .split("\n")
                        .map(line => (line.trim() ? `> ${line}` : ""))
                        .join("\n");
                    replyText += `${formattedThinking}\n\n`;
                } else if (block.type === "tool_use") {
                    replyText += `> *[Tools: ${block.name}]*\n`;
                    if (block.input) {
                        const rawPath = block.input.path || block.input.file_path || block.input.filename || block.input.file_name;

                        let fileContent = block.input.file_text ?? block.input.content ?? block.input.text ?? block.input.data;

                        if (rawPath && fileContent != null && fileContent !== "") {
                            replyText += `> File: ${rawPath}\n`;
                            filesToSend.push({
                                path: rawPath,
                                content: fileContent
                            });
                        }

                        if (block.input.command || block.input.code) {
                            const cmd = block.input.command || block.input.code || "";
                            replyText += `> Command: ${cmd.split("\n")[0]}${cmd.includes("\n") ? "..." : ""}\n`;
                        } else if (block.input.query) {
                            replyText += `> Query: ${block.input.query}\n`;
                        }
                    }
                    replyText += "\n";
                }
            }
        }

        replyText = replyText.trim();
        if (!replyText) replyText = "Tidak ada respons teks.";

        await m.reply(replyText);

        if (filesToSend.length > 0) {
            const tmpDir = path.join(process.cwd(), "tmp");
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }

            for (const file of filesToSend) {
                if (file.content) {
                    const fileName = file.path ? path.basename(file.path) : `output_${Date.now()}.txt`;
                    const tmpPath = path.join(tmpDir, fileName);

                    fs.writeFileSync(tmpPath, file.content);

                    await sock.sendMessage(m.chat, {
                        document: { url: tmpPath },
                        fileName: fileName,
                        mimetype: getMimeType(tmpPath)
                    }, { quoted: m });

                    fs.unlinkSync(tmpPath);
                }
            }
        }

        await m.react("✅");
        return { success: true, replyText, files: filesToSend };
    }

    async execute(context) {
        const { text, m, sock } = context;

        if (!text && !m.quoted?.isMedia && !m.isMedia) {
            return await m.reply("Kirim promptnya mas! Ex: .claude infokan naspad adang terdekat");
        }

        const parts = text ? text.split(' ') : ['help'];
        const command = parts[0].toLowerCase();

        const plugin = this.pluginManager.get(command);
        if (plugin) {
            await m.react('⚡');
            try {
                const result = await plugin.execute({
                    ...context,
                    args: parts.slice(1),
                    core: this,
                    pluginManager: this.pluginManager,
                    config: this.defaultConfig
                });
                return result;
            } catch (error) {
                console.error(error);
                await m.reply(`Plugin Error: ${error.message}`);
                await m.react('❌');
                throw error;
            }
        }

        await m.react("⏳");

        try {
            let files = [];
            if (m.quoted?.isMedia || m.isMedia) {
                const target = m.quoted?.isMedia ? m.quoted : m;
                const buffer = await target.download();
                if (buffer) {
                    const type = await fileTypeFromBuffer(buffer);
                    const ext = type ? type.ext : "bin";
                    const mime = type ? type.mime : "application/octet-stream";
                    files.push({
                        buffer: buffer,
                        fileName: `upload_${Date.now()}.${ext}`,
                        mimeType: mime
                    });
                }
            }

            const prompt = text || "Analisis media ini";

            const response = await this.runChat({
                prompt: prompt,
                files: files,
                model: this.defaultConfig.model,
                thinkingMode: this.defaultConfig.thinkingMode
            });

            return await this.processResponse(response, m, sock);

        } catch (error) {
            console.error(error);
            await m.reply(`Error: ${error.message}`);
            await m.react("❌");
            throw error;
        }
    }

    listPlugins() {
        return this.pluginManager.listPlugins();
    }
}

const claude = new ClaudeCore();

let handler = async (m, { conn: sock, text, usedPrefix, command }) => {
    const context = { text, m, sock, usedPrefix, command };
    await claude.execute(context);
};

handler.help = ['claude'];
handler.tags = ['eyay'];
handler.command = /^(claude|eyay|ask)$/i;

export default handler;

export { claude, ClaudeCore, PluginManager };