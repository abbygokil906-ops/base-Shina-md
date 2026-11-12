const { tool } = require("./_lib.js")

module.exports = tool({
    name: "clara",
    command: ["clara"],
    endpoint: "clara",
    desc: "Clara AI: sahabat dekat yang perhatian, lembut, pendengar yang aman",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
