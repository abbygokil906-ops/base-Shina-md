const { tool } = require("./_lib.js")

module.exports = tool({
    name: "lorkaai",
    command: ["lorkaai", "lorka"],
    endpoint: "lorka-ai",
    desc: "Lorka AI: asisten ngobrol santai",
    usage: "<pertanyaan>",
    example: "kasih ide nama kucing",
    needs: "text"
})
