const { tool } = require("./_lib.js")

module.exports = tool({
    name: "guru",
    command: ["guru", "guruai"],
    endpoint: "guru",
    desc: "Guru AI: belajar matematika, sains, bahasa, sejarah, coding, dll",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
