const { tool } = require("./_lib.js")

module.exports = tool({
    name: "gpt",
    command: ["gpt"],
    endpoint: "gpt",
    desc: "AI GPT dengan respons cepat",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
