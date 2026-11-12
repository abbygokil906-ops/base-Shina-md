const { tool } = require("./_lib.js")

module.exports = tool({
    name: "qwen",
    command: ["qwen"],
    endpoint: "qwen",
    desc: "Qwen3 80B: pintar berbahasa Indonesia",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
