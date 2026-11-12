const { tool } = require("./_lib.js")

module.exports = tool({
    name: "naxa",
    command: ["naxa"],
    endpoint: "naxa",
    desc: "Naxa AI",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
