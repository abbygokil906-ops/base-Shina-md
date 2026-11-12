const { tool } = require("./_lib.js")

module.exports = tool({
    name: "quelyx",
    command: ["quelyx", "quelyxai"],
    endpoint: "quelyx-ai",
    desc: "Quelyx AI: generasi baru, cepat, pintar, up-to-date",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
