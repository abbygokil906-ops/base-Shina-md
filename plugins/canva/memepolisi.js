const { tool, txt, img } = require("./_lib.js")

module.exports = tool({
    name: "memepolisi",
    command: ["memepolisi", "polisi"],
    endpoint: "meme-polisi",
    desc: "Meme \"timpa\" template kertas polisi",
    usage: "<teks>  (kirim/reply foto)",
    example: "jangan maling ya",
    fields: [
        txt("text", "teks"),
        img("url", "image", "photo")
    ]
})
