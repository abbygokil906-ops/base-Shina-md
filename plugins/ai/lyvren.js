const { tool } = require("./_lib.js")

module.exports = tool({
    name: "lyvren",
    command: ["lyvren", "lyvrenchat"],
    endpoint: "lyvren-chat",
    desc: "Lyvren Chat: tenang, cerdas, menjelaskan sederhana tapi mendalam",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
