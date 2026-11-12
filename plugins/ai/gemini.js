const { tool } = require("./_lib.js")

module.exports = tool({
    name: "gemini",
    command: ["gemini"],
    endpoint: "gemini",
    desc: "Google Gemini",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
