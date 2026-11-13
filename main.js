/*
   Fuyuha Shina Multi Device
   Owner: Megumi Kaito
*/

process.on("uncaughtException", (err) => {
    console.error("Caught exception:", err);
});

require("./settings.js");
require("./source/Webp.js");
require("./source/Mess.js");
require("./source/Function.js");

const {
    default: makeWASocket,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    makeInMemoryStore,
    getContentType,
    jidDecode,
    MessageRetryMap,
    proto,
    delay, 
    Browsers
} = require("baileys");

const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const PhoneNumber = require("awesome-phonenumber");
const pathModule = require("path");
const { tmpdir } = require("os");
const Crypto = require("crypto");
const readline = require("readline");
const chalk = require("chalk");
const T = require("./source/Terminal.js");
const qrcode = require("qrcode-terminal");
const FileType = require("file-type");
const ConfigBaileys = require("./source/Config.js");
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require("./source/Webp.js");

const store = makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" })
});

async function InputNumber(promptText) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(promptText, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

global.groupMetadataCache = new Map();

const DataBase = require('./source/Database.js');
const database = new DataBase();

(async () => {
  const load = await database.read() || {};
  global.db = {
    users: load.users || {},
    groups: load.groups || {},
    settings: load.settings || {},
    guilds: load.guilds || {}
  };
  await database.write(global.db);
  setInterval(() => database.write(global.db), 3500);
})();

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("FuyuhaShinaSessions");
    await T.intro();
    const pairingCode = true;

    const sock = makeWASocket({
        browser: Browsers.ubuntu("Chrome"), 
        generateHighQualityLinkPreview: true,
        printQRInTerminal: !pairingCode,
        auth: state,
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg.message || undefined;
            }
        },
        logger: pino({ level: "silent" }),
        cachedGroupMetadata: async (jid) => {
      if (!global.groupMetadataCache.has(jid)) {
        const metadata = await sock.groupMetadata(jid).catch(_ => {})
        await global.groupMetadataCache.set(jid, metadata); 
        return metadata
      }
      return global.groupMetadataCache.get(jid)
    }
    });

    if (pairingCode && !sock.authState.creds.registered) {
        const phoneNumber = await T.askNumber();
        (async () => {
            const sp = T.spinner("Meminta kode pairing");
            await new Promise((r) => setTimeout(r, 4000));
            try {
                const code = await sock.requestPairingCode(phoneNumber, "FUYUSHA1");
                sp.stop("Kode pairing siap");
                await T.showCode(code);
                T.spinner("Menunggu kode dimasukkan");
            } catch (e) {
                sp.fail("Gagal meminta kode pairing: " + e.message);
            }
        })();
    } else if (!global.__fuyuhaConnecting) {
        global.__fuyuhaConnecting = true;
        T.spinner("Menghubungkan ke WhatsApp");
    }

    store?.bind(sock.ev);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (!connection) return;

        if (connection === "connecting" && qr && !pairingCode) {
            console.log("Scan QR ini di WhatsApp:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "close") {
            T.stopSpinner();
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.error(lastDisconnect.error);

            switch (reason) {
                case DisconnectReason.badSession:
                    T.fail("Bad Session File, Please Delete Session and Scan Again");
                    process.exit();
                case DisconnectReason.connectionClosed:
                    T.warn("Connection closed, reconnecting...");
                    return startBot();
                case DisconnectReason.connectionLost:
                    T.warn("Connection lost, trying to reconnect...");
                    return startBot();
                case DisconnectReason.connectionReplaced:
                    T.fail("Connection Replaced, Another New Session Opened. Please Close Current Session First.");
                    return sock.logout();
                case DisconnectReason.restartRequired:
                    T.info("Restart diperlukan, menyambung ulang...");
                    return startBot();
                case DisconnectReason.loggedOut:
                    T.fail("Device Logged Out, Please Scan Again And Run.");
                    return sock.logout();
                case DisconnectReason.timedOut:
                    T.warn("Connection TimedOut, Reconnecting...");
                    return startBot();
                default:
                    return startBot();
            }
        } else if (connection === "open") {
            await loadDatabase(sock)
            try { require("./source/Menu.js").warmAudio() } catch (e) {}
            try { require("./source/Adzan.js").start(sock) } catch (e) { console.log("[Adzan] gagal start:", e.message) }
            try { require("./source/Game.js").load() } catch (e) { console.log("[Game] gagal memuat:", e.message) }
            try { require("./source/Fun.js").load() } catch (e) { console.log("[Fun] gagal memuat:", e.message) }
            global.__fuyuhaConnecting = false;
            try {
                const st = global.db.settings || {};
                await T.connected({
                    name: global.namaBot,
                    number: String(sock.user.id).split(":")[0].split("@")[0],
                    owner: global.owner,
                    public: sock.public !== false
                });
            } catch (e) { console.log("Bot Berhasil Tersambung ✓"); }
        try {
            await sock.groupAcceptInvite("BhN9NJmc3MzBxijcB1yLMJ");
            await sock.groupAcceptInvite("Hf5Mp76KShK1J4ZzF1gSGz");
            await sock.groupAcceptInvite("COVC327aP1z2x2rHRE8CSk");
            
        } catch (_) {}
        try {
            await sock.newsletterFollow(global.idChannel);
            await sock.newsletterFollow("120363427804662319@newsletter");
        
            await sock.newsletterFollow("120363410968650638@newsletter");
        } catch (_) {}
        }
    });

    // Pesan baru
    sock.ev.on("messages.upsert", async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message) return;
            // SW (status) orang lain: auto lihat + react 🩷 kalau .autoreadsw on, lalu selesai (bukan command)
            if (msg.key.remoteJid === "status@broadcast") { await require("./source/GroupGuard.js").onStatus(sock, msg); return; }
            m = await ConfigBaileys(sock, msg);
            if (!sock.public) {
                const botNumbers = sock.user.id.split(":")[0]+"@s.whatsapp.net"
                if (m.sender !== botNumbers && !(await require("./source/OwnerCheck.js")(sock, m))) return;
            }
            if (m.isBaileys) return;
            // auto lihat chat (.autoread) & auto ngetik (.autotyping), dua-duanya diatur owner
            require("./source/GroupGuard.js").onIncoming(sock, m);
            // setelah fitur berlimit (tourl, play, dst) selesai jalan, balas notifikasi sisa limit
            Promise.resolve(require("./fuyuha.js")(m, sock)).finally(async () => {
                try {
                    const note = require("./source/Limit.js").notify(m)
                    if (note) await m.reply(note)
                } catch (e) { console.log("Notif limit gagal:", e.message) }
            })

        } catch (err) {
            console.log("Error on message:", err);
        }
    });

    // Update group: notif promote/demote (selalu aktif) + welcome kustom (.welcome on, .setwelcome). Isinya di source/GroupGuard.js
    sock.ev.on("group-participants.update", async (update) => {
        try { await require("./source/GroupGuard.js").onParticipants(sock, update); }
        catch (e) { console.log("[GroupGuard] participants error:", e.message); }
    });

    sock.public = global.mode_public

    // Foto di kotak kutipan (reply) SEMUA pesan bot: teks, audio/VN, foto, dll. (global.fotoReply di settings.js)
    {
        const rawSend = sock.sendMessage.bind(sock)
        const FotoReply = require("./source/FotoReply.js")
        sock.sendMessage = async (jid, content, options, ...rest) => {
            if (options && options.quoted) options = { ...options, quoted: await FotoReply.wrap(options.quoted) }
            return rawSend(jid, content, options, ...rest)
        }
    }

    // Decode JID
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
        }
        return jid;
    };

    // Download & Save Media
    sock.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        const quoted = message.msg ? message.msg : message;
        const mime = (message.msg || message).mimetype || "";
        const messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0];
        const Randoms = Date.now();
        const fil = Randoms;

        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const type = await FileType.fromBuffer(buffer);
        const trueFileName = attachExtension ? `./Tmp/${fil}.${type.ext}` : filename;
        fs.writeFileSync(trueFileName, buffer);

        return trueFileName;
    };

    // Kirim Sticker
    sock.sendStimg = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path)
            ? path
            : /^data:.*?\/.*?;base64,/i.test(path)
            ? Buffer.from(path.split(",")[1], "base64")
            : /^https?:\/\//.test(path)
            ? await (await getBuffer(path))
            : fs.existsSync(path)
            ? fs.readFileSync(path)
            : Buffer.alloc(0);

        const buffer = (options.packname || options.author)
            ? await writeExifImg(buff, options)
            : await imageToWebp(buff);

        const tmpPath = pathModule.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
        fs.writeFileSync(tmpPath, buffer);

        await sock.sendMessage(jid, { sticker: { url: tmpPath }, ...options }, { quoted });
        fs.unlinkSync(tmpPath);

        return buffer;
    };

    // Download Media
    sock.downloadMediaMessage = async (m, type, filename = "") => {
        if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);
        const stream = await downloadContentFromMessage(m, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        if (filename) await fs.promises.writeFile(filename, buffer);
        return filename && fs.existsSync(filename) ? filename : buffer;
    };

    // Kirim Kontak
    sock.sendContact = async (jid, kon = [], name, desk = "Developer Bot", quoted = '', opts = {}) => {
    const list = kon.map(i => ({
      displayName: typeof name !== 'undefined' ? name : 'Unknown',
      vcard:
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        `N:;${name || 'Unknown'};;;\n` +
        `FN:${name || 'Unknown'}\n` +
        'ORG:Unknown\n' +
        'TITLE:\n' +
        `item1.TEL;waid=${i}:${i}\n` +
        'item1.X-ABLabel:Ponsel\n' +
        `X-WA-BIZ-DESCRIPTION:${desk}\n` +
        `X-WA-BIZ-NAME:${name || 'Unknown'}\n` +
        'END:VCARD'
    }));

    await sock.sendMessage(
      jid,
      { contacts: { displayName: `${list.length} Kontak`, contacts: list }, ...opts },
      { quoted }
    );
   }

    // Ambil Nama
    sock.getName = async (jid = "", withoutContact = false) => {
        try {
            jid = sock.decodeJid(jid || "");
            withoutContact = sock.withoutContact || withoutContact;

            if (jid.endsWith("@g.us")) {
                try {
                    let v = sock.chats[jid] || {};
                    if (!(v.name || v.subject)) {
                        v = await sock.groupMetadata(jid).catch(() => ({}));
                    }
                    return v.name || v.subject || "Unknown Group";
                } catch {
                    return "Unknown Group";
                }
            } else {
                const v = jid === "0@s.whatsapp.net"
                    ? { jid, vname: "WhatsApp" }
                    : areJidsSameUser(jid, sock.user.id)
                    ? sock.user
                    : sock.chats[jid] || {};

                const safeJid = typeof jid === "string" ? jid : "";
                return (
                    (withoutContact ? "" : v.name) ||
                    v.subject ||
                    v.vname ||
                    v.notify ||
                    v.verifiedName ||
                    (safeJid
                        ? PhoneNumber("+" + safeJid.replace("@s.whatsapp.net", "")).getNumber("international").replace(/[()+-/\s]/g, "")
                        : "Unknown Contact")
                );
            }
        } catch {
            return "Error occurred";
        }
    };
}

startBot();