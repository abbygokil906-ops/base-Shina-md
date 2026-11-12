const { tool } = require("./_lib.js")

module.exports = tool({
    name: "blackbox",
    command: ["blackbox", "blackboxai"],
    endpoint: "blackbox-ai",
    desc: "Blackbox AI: tanya jawab & bantuan coding",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
