const { tool } = require("./_lib.js")

module.exports = tool({
    name: "velrix",
    command: ["velrix", "velrixchat"],
    endpoint: "velrix-chat",
    desc: "Velrix Chat: ahli menjelaskan teknologi & pengetahuan umum dengan rapi",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
