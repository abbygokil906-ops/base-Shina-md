const { tool } = require("./_lib.js")

module.exports = tool({
    name: "noxora",
    command: ["noxora", "noxoraai"],
    endpoint: "noxora-ai",
    desc: "Noxora AI: logis, fokus, efisien, langsung ke inti",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
