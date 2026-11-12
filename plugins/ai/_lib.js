/*
  Helper fitur AI (file ini tidak dimuat sebagai fitur karena diawali "_").
  Endpoint otomatis /ai/<endpoint> di ROOT API (source/ApiKit.js).

  Input user:
    .<command> <pertanyaan>        -> dikirim ke parameter teks (nama parameter di TEXT, semua alias dikirim sekaligus)
    reply pesan teks               -> isi pesan yang di-reply dipakai sebagai pertanyaan
    key=value                      -> diteruskan apa adanya ke API (mis. model=gpt-4o search=true character=Rin style=...)
    foto dikirim / di-reply        -> kalau fiturnya mendukung gambar (def.image), foto otomatis di-upload & dikirim sebagai link
  Fitur dengan def.session (geminiv2, notrack) menyimpan id percakapan dari hasil API per pengguna, jadi obrolan nyambung.
  Ketik "reset" setelah command (mis. .geminiv2 reset) untuk mulai percakapan baru.
  Jawaban AI dirapikan (**tebal** -> *tebal* ala WhatsApp) dan dipecah kalau panjang.
*/
const kit = require("../../source/ApiTool.js")
const Kit = require("../../source/ApiKit.js")
const base = kit.createKit("ai")
const { HTTP, Usage } = kit

const TEXT = ["text", "q", "query", "message"]
const ANSWER_KEYS = ["answer", "response", "reply", "text", "message", "content", "output", "result", "data"]
const SUGGEST_KEYS = ["suggestions", "suggestion", "followup", "followups", "follow_up", "related", "saran"]
const sessions = new Map()

const scalar = (v) => v !== null && v !== undefined && typeof v !== "object" && String(v).trim() !== ""

function answerOf(payload) {
    if (scalar(payload)) return { text: String(payload).trim(), extra: "" }
    if (Array.isArray(payload)) return { text: payload.map((x) => (scalar(x) ? x : kit.fmt(x))).join("\n").trim(), extra: "" }
    if (!payload || typeof payload !== "object") return { text: "", extra: "" }
    let text = ""
    for (const k of ANSWER_KEYS) {
        const v = payload[k]
        if (scalar(v)) { text = String(v).trim(); break }
        if (v && typeof v === "object") { const inner = answerOf(v); if (inner.text) { text = inner.text; break } }
    }
    let extra = ""
    for (const k of SUGGEST_KEYS) {
        const v = payload[k]
        if (Array.isArray(v) && v.length) {
            extra = "\n\n💡 *Pertanyaan lanjutan:*\n" + v.slice(0, 5).map((x) => `• ${scalar(x) ? x : x.question || x.text || kit.fmt(x)}`).join("\n")
            break
        }
    }
    if (!text) text = kit.fmt(payload)
    return { text, extra }
}

function findKey(o, keys, d = 0) {
    if (!o || typeof o !== "object" || d > 3) return null
    for (const k of keys) if (scalar(o[k])) return String(o[k])
    for (const v of Object.values(o)) { const r = findKey(v, keys, d + 1); if (r) return r }
    return null
}

const wa = (s) => s.replace(/\*\*(.+?)\*\*/gs, "*$1*").replace(/^#{1,6}\s+(.+)$/gm, "*$1*")

const chunks = (text, n = 3500) => {
    const out = []
    let cur = ""
    for (const line of text.split("\n")) {
        if ((cur + "\n" + line).length > n && cur) { out.push(cur); cur = line } else cur = cur ? cur + "\n" + line : line
    }
    if (cur) out.push(cur)
    return out
}

function tool(def) {
    const { image, session, prompt, ...rest } = def
    return {
        ...rest,
        async run(ctx) {
            const { m, args } = ctx
            const params = {}
            const words = []
            for (const a of args) {
                const kv = a.match(/^([a-z_][a-z0-9_]*)=(.+)$/i)
                if (kv) params[kv[1]] = kv[2]
                else words.push(a)
            }
            let text = (words.length ? words.join(" ") : ctx.text.replace(/\s+/g, " ")).trim()
            const who = `${def.name}:${m.sender || m.chat}`

            if (session && /^reset$/i.test(text)) { sessions.delete(who); return m.reply("♻️ Percakapan direset. Silakan mulai obrolan baru.") }
            if (!text) throw new Usage()

            if (prompt) {   // aicostum: "<prompt/kepribadian>|<pertanyaan>"
                const i = text.indexOf("|")
                if (i < 1 || !text.slice(i + 1).trim()) throw new Usage()
                params.prompt = text.slice(0, i).trim()
                text = text.slice(i + 1).trim()
            }
            for (const n of TEXT) params[n] = text

            if (image) {
                const tok = args.find((a) => HTTP.test(a))
                let link = tok || null
                if (tok) { for (const n of TEXT) params[n] = text.replace(tok, "").trim() || text }
                else { const buf = await Kit.getMedia(m, /image/); if (buf) link = await Kit.uploadMedia(buf) }
                if (link) for (const n of image) params[n] = link
            }
            if (session && sessions.has(who)) for (const n of session.params) if (!params[n]) params[n] = sessions.get(who)

            const res = await base.call(def.endpoint, params, def.timeout || 120000, "ai")
            const payload = res.json?.result ?? res.json?.data ?? res.json
            const { text: ans, extra } = answerOf(payload)
            if (session) { const id = findKey(res.json, session.keys); if (id) sessions.set(who, id) }
            const out = wa((ans || "Tidak ada jawaban.") + extra)
            for (const p of chunks(out).slice(0, 4)) await m.reply(p)
        }
    }
}

module.exports = { tool, Usage }
