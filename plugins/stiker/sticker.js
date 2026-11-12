const fs = require("fs")
const Webp = require("../../source/Webp.js")
const { PACK } = require("./_lib.js")

module.exports = {
    name: "sticker",
    command: ["sticker", "stiker", "sgif", "s"],
    desc: "Ubah foto/video jadi stiker (video maks 15 detik)",
    async run({ sock, m, prefix, command }) {
        const q = m.quoted || m
        const mime = q?.msg?.mimetype || q?.mimetype || ""
        if (!/image|video/.test(mime)) return m.reply(`Kirim/reply foto atau video dengan caption ${prefix}${command}`)
        if (/video/.test(mime) && (q.seconds || q.msg?.seconds || 0) > 15) return m.reply("Durasi video maksimal 15 detik!")
        const file = await sock.downloadAndSaveMediaMessage(q)
        try {
            const buf = fs.readFileSync(file)
            const meta = { packname: PACK, author: global.namaOwner || "" }
            const webp = /video/.test(mime) ? await Webp.writeExifVid(buf, meta) : await Webp.writeExifImg(buf, meta)
            await sock.sendMessage(m.chat, { sticker: webp }, { quoted: m })
        } finally { try { fs.unlinkSync(file) } catch (_) {} }
    }
}
