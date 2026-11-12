const { tool } = require("./_lib.js")

module.exports = tool({
    name: "myvra",
    command: ["myvra", "myvraai"],
    endpoint: "myvra-ai",
    desc: "Myvra AI: ramah, pintar, empatik, jawaban jelas & akurat",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
