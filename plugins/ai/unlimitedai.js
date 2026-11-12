const { tool } = require("./_lib.js")

module.exports = tool({
    name: "unlimitedai",
    command: ["unlimitedai"],
    endpoint: "unlimitedai",
    desc: "Unlimited AI: pilih karakter dengan character=Rin / Vestia Zeta / Frieren",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
