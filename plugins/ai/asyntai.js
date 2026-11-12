const { tool } = require("./_lib.js")

module.exports = tool({
    name: "asyntai",
    command: ["asyntai"],
    endpoint: "asyntai",
    desc: "Asyntai: asisten AI chat untuk pertanyaan sehari-hari",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
