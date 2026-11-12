const { tool } = require("./_lib.js")

module.exports = tool({
    name: "ethan",
    command: ["ethan"],
    endpoint: "ethan",
    desc: "Ethan AI: sosok dewasa tenang & bijaksana, cocok minta nasihat",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
