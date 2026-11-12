const { tool } = require("./_lib.js")

module.exports = tool({
    name: "notegpt",
    command: ["notegpt"],
    endpoint: "notegpt",
    desc: "NoteGPT: bisa pilih model & aktifkan pencarian web (model=... search=true)",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
