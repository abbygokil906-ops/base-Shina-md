const { apiUrl, sendSticker, uploadMedia, getMedia } = require("./_lib.js")

module.exports = {
    name: "smeme",
    command: ["smeme"],
    desc: "Stiker meme dari foto (teks atas & bawah)",
    usage: "<teks atas>|<teks bawah>  (kirim/reply foto)",
    example: "kamu|lagi apa",
    async run({ sock, m, text, prefix }) {
        const img = await getMedia(m, /image/)
        if (!img || !text) return m.reply(`*Cara pakai:*\nKirim/reply *foto* dengan caption\n${prefix}smeme <teks atas>|<teks bawah>\n\n*Contoh:*\n${prefix}smeme kamu|lagi apa`)
        const [top, bottom = ""] = text.split("|").map((x) => x.trim())
        const url = await uploadMedia(img)
        await sendSticker(sock, m, apiUrl("smeme", { url, top, bottom }))
    }
}
