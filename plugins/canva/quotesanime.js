const { tool, txt, opt } = require("./_lib.js")

module.exports = tool({
    name: "quotesanime",
    command: ["quotesanime"],
    endpoint: "qoutes-anime",
    desc: "Quotes dengan karakter anime pilihan",
    usage: "<teks>|<nama pembuat>|<karakter>",
    example: "Jangan menyerah|Fuyuha|gojo",
    needs: "text",
    fields: [
        txt("text", "quote"),
        opt(txt("name", "author", "nama")),
        opt(txt("character", "karakter", "anime"))
    ]
})
