const { apiUrl, sendSticker } = require("./_lib.js")

const EMOJI = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu

module.exports = {
    name: "emojimix",
    command: ["emojimix"],
    desc: "Gabungkan 2 emoji jadi 1 stiker",
    usage: "<emoji1>+<emoji2>",
    example: "😳+😍",
    async run({ sock, m, text, prefix }) {
        const [e1, e2] = (text || m.quoted?.text || "").match(EMOJI) || []
        if (!e1 || !e2) return m.reply(`*Cara pakai:*\n${prefix}emojimix <emoji1>+<emoji2>\n\n*Contoh:*\n${prefix}emojimix 😳+😍`)
        await sendSticker(sock, m, apiUrl("emojimix", { emoji1: e1, emoji2: e2 }))
    }
}
