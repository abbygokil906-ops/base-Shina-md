const { tool } = require("./_lib.js")

module.exports = tool({
    name: "elyvyn",
    command: ["elyvyn"],
    endpoint: "elyvyn",
    desc: "Elyvyn: bijak, sabar, edukatif, pandai menyederhanakan topik rumit",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
