const { apiUrl, sendSticker, uploadMedia, getMedia } = require("./_lib.js")

module.exports = {
    name: "smemevid",
    command: ["smemevid"],
    desc: "Stiker meme dari video/gif (teks atas & bawah)",
    usage: "<teks atas>|<teks bawah>  (kirim/reply video)",
    example: "kamu|lagi apa",
    async run({ sock, m, text, prefix }) {
        const vid = await getMedia(m, /video/)
        if (!vid || !text) return m.reply(`*Cara pakai:*\nKirim/reply *video* dengan caption\n${prefix}smemevid <teks atas>|<teks bawah>\n\n*Contoh:*\n${prefix}smemevid kamu|lagi apa`)
        const [top, bottom = ""] = text.split("|").map((x) => x.trim())
        const url = await uploadMedia(vid)
        await sendSticker(sock, m, apiUrl("smemevid", { url, top, bottom }))
    }
}
