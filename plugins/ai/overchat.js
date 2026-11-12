const { tool } = require("./_lib.js")

module.exports = tool({
    name: "overchat",
    command: ["overchat"],
    endpoint: "overchat",
    desc: "Overchat AI (GPT-4o)",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
