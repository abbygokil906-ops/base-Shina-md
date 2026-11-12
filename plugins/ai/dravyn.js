const { tool } = require("./_lib.js")

module.exports = tool({
    name: "dravyn",
    command: ["dravyn", "dravynai"],
    endpoint: "dravyn-ai",
    desc: "Dravyn AI: jujur, objektif, seimbang, fakta tanpa bias",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
