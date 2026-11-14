/*
  .removebg2 — hapus background foto lewat iLoveIMG (scraper: ./_iloveimg.js).
  Cadangan buat .removebg (yang pakai API). Hasil dikirim sebagai dokumen PNG supaya latar transparan tetap utuh.
*/
const axios = require("axios")
const { linkAndRest } = require("./_lib.js")
const { removeBgILoveImg } = require("./_iloveimg.js")

module.exports = {
    name: "removebg2",
    command: ["removebg2", "rbg2", "hapusbg"],
    desc: "Hapus background foto (iLoveIMG)",
    usage: "(kirim/reply foto) atau <link gambar>",
    async run(ctx) {
        const { sock, m } = ctx
        const { link } = await linkAndRest(ctx, /image/)
        await sock.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {})
        try {
            const r = await removeBgILoveImg(link)
            // download hasil (butuh token yang sama); kalau gagal, coba lewat link langsung
            let buf, mime = "image/png"
            try {
                const res = await axios.get(r.downloadUrl, { headers: r._auth, responseType: "arraybuffer", timeout: 60000 })
                buf = Buffer.from(res.data)
                mime = String(res.headers["content-type"] || "").split(";")[0] || mime
            } catch (e) { buf = null }
            const src = buf || { url: r.downloadUrl }
            const isImg = /^image\//.test(mime)
            await sock.sendMessage(m.chat, {
                document: src,
                mimetype: isImg ? mime : "application/octet-stream",
                fileName: isImg ? "removebg.png" : "removebg.bin",
                caption: "Background berhasil dihapus"
            }, { quoted: m })
            await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {})
        } catch (e) {
            await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {})
            throw e
        }
    }
}
