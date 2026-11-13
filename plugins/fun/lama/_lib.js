/*
  Helper fitur Fun (file ini tidak dimuat sebagai fitur karena diawali "_").
  Endpoint otomatis /fun/<endpoint> di ROOT API (source/ApiKit.js).

  PARAM = nama parameter query. Kalau API memakai nama lain, ganti di sini.
  Hasil API dibaca otomatis: teks langsung / objek (kunci quote, pantun, text, dst) / gambar langsung (pap).
  Hasil teks diberi judul fitur (def.title) supaya rapi di chat.
*/
const kit = require("../../../source/ApiTool.js")
const base = kit.createKit("fun")
const { Usage } = kit

const PARAM = { name: "nama" }

const TEXT_KEYS = ["quote", "quotes", "pantun", "gombal", "text", "teks", "kata", "message", "pesan", "isi", "content", "result"]
const META_SKIP = /^(status|success|ok|creator|author|code)$/i

function bodyOf(payload) {
    if (payload === null || payload === undefined) return ""
    if (typeof payload === "string") return payload.trim()
    if (Array.isArray(payload)) return payload.map((x) => (typeof x === "string" ? x : kit.fmt(x))).join("\n").trim()
    for (const k of TEXT_KEYS) {
        if (typeof payload[k] === "string" && payload[k].trim()) {
            const rest = Object.fromEntries(Object.entries(payload).filter(([kk, v]) => kk !== k && !META_SKIP.test(kk) && v !== null && typeof v !== "object" && String(v).trim()))
            const meta = Object.keys(rest).length ? "\n\n" + kit.fmt(rest) : ""
            return payload[k].trim() + meta
        }
    }
    return kit.fmt(Object.fromEntries(Object.entries(payload).filter(([k]) => !META_SKIP.test(k))))
}

function tool(def) {
    const { params, ...rest } = def
    return {
        ...rest,
        async run(ctx) {
            const p = params ? await params(ctx) : {}
            const res = await base.call(def.endpoint, p, def.timeout || 60000, "fun")
            if (res.buffer) return base.deliver(ctx.sock, ctx.m, { ...def, output: "auto" }, res)   // gambar langsung (pap)
            const payload = res.json.result ?? res.json.data ?? res.json
            if (def.output === "image") {
                const url = kit.findUrl(payload) || kit.findUrl(res.json)
                if (url) return ctx.sock.sendMessage(ctx.m.chat, { image: { url }, caption: def.title || "Selesai" }, { quoted: ctx.m })
            }
            const body = bodyOf(payload) || "Selesai"
            await ctx.m.reply((def.title ? `*${def.title}*\n\n` : "") + body.slice(0, 3500))
        }
    }
}

// satu kata/kalimat nama
const nameArg = () => ({ text }) => {
    const v = text.trim()
    if (!v) throw new Usage()
    return { [PARAM.name]: v, name: v }
}

module.exports = { tool, nameArg, PARAM, Usage }
