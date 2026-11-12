const { tool } = require("./_lib.js")

module.exports = tool({
    name: "feelbetter",
    command: ["feelbetter"],
    endpoint: "feelbetter",
    desc: "FeelBetter AI: curhat & tanya jawab santai",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
