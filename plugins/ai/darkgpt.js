const { tool } = require("./_lib.js")

module.exports = tool({
    name: "darkgpt",
    command: ["darkgpt"],
    endpoint: "darkgpt",
    desc: "DarkGPT",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
