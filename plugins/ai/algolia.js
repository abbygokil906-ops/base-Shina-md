const { tool } = require("./_lib.js")

module.exports = tool({
    name: "algolia",
    command: ["algolia"],
    endpoint: "algolia",
    desc: "Algolia Agent: asisten AI untuk dokumentasi & pencarian (ada saran pertanyaan lanjutan)",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
