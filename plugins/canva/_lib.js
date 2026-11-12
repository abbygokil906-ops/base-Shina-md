/*
  Helper fitur Canva (file ini tidak dimuat sebagai fitur karena diawali "_").
  Endpoint otomatis /canvas/<endpoint> di ROOT API (source/ApiKit.js). Hasil gambar langsung dikirim sebagai foto.

  Tiap fitur mendeklarasikan `fields` = daftar parameter API, urut sesuai urutan input user:
    txt("nama", "alias")  -> teks. Diisi dari input dipisah "|"  (contoh: .nokia halo|Budi|01/01/2026|10:00)
    img("url", "image")   -> gambar. Diambil dari foto yang dikirim / di-reply (otomatis di-upload), atau link gambar di perintah
    opt(...)              -> boleh dikosongkan (kalau kosong parameter tidak dikirim)
  Satu field boleh punya beberapa nama (alias): semuanya dikirim, jadi kalau nama parameter API-nya
  ternyata beda dari tebakan, cukup tambah/ganti namanya di file fitur yang bersangkutan.
*/
const kit = require("../../source/ApiTool.js")
const Kit = require("../../source/ApiKit.js")
const base = kit.createKit("canvas")
const { HTTP, Usage } = kit

const txt = (...names) => ({ type: "text", names })
const img = (...names) => ({ type: "image", names })
const opt = (f) => ({ ...f, opt: true })

async function buildParams({ m, args, text }, fields) {
    const out = {}
    const imgFields = fields.filter((f) => f.type === "image")
    const txtFields = fields.filter((f) => f.type === "text")

    // gambar: link di perintah, atau foto yang dikirim / di-reply
    let rest = text
    let link = null
    if (imgFields.length) {
        const tok = args.find((a) => HTTP.test(a))
        if (tok) { link = tok; rest = rest.replace(tok, " ").trim() }
        else {
            const buf = await Kit.getMedia(m, /image/)   // null kalau tidak ada foto
            if (buf) link = await Kit.uploadMedia(buf)
        }
        if (!link && imgFields.some((f) => !f.opt)) throw new Usage()
        if (link) for (const f of imgFields) for (const n of f.names) out[n] = link
    }

    // teks: dipisah "|" (kalau cuma 1 field teks, seluruh teks dipakai apa adanya)
    const parts = txtFields.length > 1 ? rest.split("|").map((s) => s.trim()) : [rest.trim()]
    txtFields.forEach((f, i) => {
        const v = parts[i]
        if (v) { for (const n of f.names) out[n] = v }
        else if (!f.opt) throw new Usage()
    })
    return out
}

function tool(def) {
    const { fields, note, ...rest } = def
    return {
        ...rest,
        async run(ctx) {
            const params = await buildParams(ctx, fields)
            const res = await base.call(def.endpoint, params, def.timeout || 120000, "canvas")
            const caption = ["✅ Selesai", note].filter(Boolean).join("\n")
            const q = { quoted: ctx.m }
            if (res.buffer) return ctx.sock.sendMessage(ctx.m.chat, { image: res.buffer, caption }, q)
            const payload = res.json.result ?? res.json.data ?? res.json
            const url = kit.findUrl(payload) || kit.findUrl(res.json)
            if (url) return ctx.sock.sendMessage(ctx.m.chat, { image: { url }, caption }, q)
            await ctx.m.reply(kit.textOf(res.json))
        }
    }
}

module.exports = { tool, txt, img, opt, Usage }
