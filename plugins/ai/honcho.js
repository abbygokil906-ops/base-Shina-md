const { tool } = require("./_lib.js")

module.exports = tool({
    name: "honcho",
    command: ["honcho"],
    endpoint: "honcho",
    desc: "Honcho AI (Claude Sonnet): asisten serba bisa",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
