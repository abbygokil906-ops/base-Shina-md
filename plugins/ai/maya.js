const { tool } = require("./_lib.js")

module.exports = tool({
    name: "maya",
    command: ["maya", "mayaai"],
    endpoint: "maya",
    desc: "Maya AI: perempuan muda cerdas, kreatif, santai, asik diajak diskusi ide",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
