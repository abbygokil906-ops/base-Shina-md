const { tool } = require("./_lib.js")

module.exports = tool({
    name: "klyra",
    command: ["klyra"],
    endpoint: "klyra",
    desc: "Klyra: ceria, hangat, suportif, memotivasi",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
