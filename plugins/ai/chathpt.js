const { tool } = require("./_lib.js")

module.exports = tool({
    name: "chathpt",
    command: ["chathpt"],
    endpoint: "chathpt",
    desc: "Chat AI (ChatHPT)",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
