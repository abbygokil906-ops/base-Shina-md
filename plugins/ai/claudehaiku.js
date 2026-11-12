const { tool } = require("./_lib.js")

module.exports = tool({
    name: "claudehaiku",
    command: ["claudehaiku", "haiku"],
    endpoint: "claudehaiku",
    desc: "Claude Haiku 4.5: cepat dan ringkas",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
