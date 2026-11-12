/*
  Helper fitur AI Image (file ini tidak dimuat sebagai fitur karena diawali "_").
  Endpoint otomatis /ai-image/<endpoint> di ROOT API (source/ApiKit.js). Hasil gambar langsung dikirim sebagai foto.

  Jenis fitur lewat def.mode:
    "photo"   -> edit foto: kirim / reply foto (atau tulis link gambar) lalu ketik command-nya
    "prompt"  -> gambar dari teks: .<command> <prompt>
    "both"    -> foto + prompt wajib (def.promptRequired) atau opsional (notegpt-nano, editimg)
  Input tambahan:
    key=value        -> diteruskan apa adanya ke API (mis. model=... size=1024x1024 format=png)
    def.options      -> kata pilihan di perintah (mis. ".hd 4", ".ihancer ultra", ".unblur photo-enhancer")
                        { names: [nama param], match: /regex/ atau [daftar kata], strip: /dihapus dari nilai/ }
  Nama parameter dikirim dengan beberapa alias sekaligus (IMG / PROMPT). Kalau API memakai nama lain,
  ubah di sini atau di def.options file fitur yang bersangkutan.
*/
const kit = require("../../source/ApiTool.js")
const Kit = require("../../source/ApiKit.js")
const base = kit.createKit("ai-image")
const { HTTP, Usage } = kit

const IMG = ["url", "image"]
const PROMPT = ["prompt", "text"]
const scalar = (v) => v !== null && v !== undefined && typeof v !== "object" && String(v).trim() !== ""

function tool(def) {
    const { mode, promptRequired, options, output, ...rest } = def
    return {
        ...rest,
        async run(ctx) {
            const { m, args } = ctx
            const params = {}
            let words = []
            for (const a of args) {
                const kv = a.match(/^([a-z_][a-z0-9_]*)=(.+)$/i)
                if (kv) params[kv[1]] = kv[2]
                else words.push(a)
            }

            // gambar: link di perintah, atau foto yang dikirim / di-reply
            if (mode !== "prompt") {
                let link = words.find((a) => HTTP.test(a)) || null
                if (link) words = words.filter((a) => a !== link)
                else { const buf = await Kit.getMedia(m, /image/); if (buf) link = await Kit.uploadMedia(buf) }
                if (!link) throw new Usage()
                for (const n of IMG) params[n] = link
            }

            // kata pilihan (mis. 4x, ultra, photo-enhancer)
            for (const o of options || []) {
                const i = words.findIndex((w) => (Array.isArray(o.match) ? o.match.includes(w.toLowerCase()) : o.match.test(w)))
                if (i >= 0) {
                    const v = o.strip ? words[i].replace(o.strip, "") : words[i].toLowerCase()
                    for (const n of o.names) if (!params[n]) params[n] = v
                    words.splice(i, 1)
                }
            }

            // prompt
            const prompt = words.join(" ").trim() || (mode === "prompt" ? ctx.text.trim() : "")
            const needPrompt = mode === "prompt" || (mode === "both" && promptRequired)
            if (!prompt && needPrompt) throw new Usage()
            if (prompt) for (const n of PROMPT) if (!params[n]) params[n] = prompt

            const res = await base.call(def.endpoint, params, def.timeout || 180000, "ai-image")
            const q = { quoted: m }
            if (res.buffer) return ctx.sock.sendMessage(m.chat, { image: res.buffer, caption: "✅ Selesai" }, q)
            const payload = res.json?.result ?? res.json?.data ?? res.json
            if (output === "text") {
                const t = scalar(payload) ? String(payload) : kit.textOf(res.json)
                return m.reply(`*${def.title || "Hasil"}*\n\n${t}`.slice(0, 3800))
            }
            const url = kit.findUrl(payload) || kit.findUrl(res.json)
            if (url) return ctx.sock.sendMessage(m.chat, { image: { url }, caption: "✅ Selesai" }, q)
            await m.reply(kit.textOf(res.json))
        }
    }
}

module.exports = { tool, Usage }
