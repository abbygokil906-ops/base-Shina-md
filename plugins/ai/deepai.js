const { tool } = require("./_lib.js")

module.exports = tool({
    name: "deepai",
    command: ["deepai"],
    endpoint: "deepai",
    desc: "DeepAI Chat: asisten serba bisa",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
