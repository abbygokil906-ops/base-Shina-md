const { tool, txt, opt } = require("./_lib.js")

module.exports = tool({
    name: "quotesestetik",
    command: ["quotesestetik", "aquotes"],
    endpoint: "quotes",
    desc: "Quotes estetik ([kata] dibungkus kurung siku = disorot warna)",
    usage: "<teks>|<penulis>",
    example: "Hidup itu [indah]|Fuyuha",
    needs: "text",
    fields: [
        txt("text", "quote"),
        opt(txt("author", "name"))
    ]
})
