const { tool, txt, img } = require("./_lib.js")

module.exports = tool({
    name: "afinitasml",
    command: ["afinitasml"],
    endpoint: "afinitasml",
    desc: "Card afinitas Mobile Legends dari fotomu",
    usage: "<nama>  (kirim/reply foto)",
    example: "Budi",
    fields: [
        img("url", "image", "photo"),
        txt("name", "nama")
    ]
})
