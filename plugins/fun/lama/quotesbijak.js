const { tool } = require("./_lib.js")

module.exports = tool({
    name: "quotesbijak",
    command: ["quotesbijak", "bijak"],
    endpoint: "quotes-bijak",
    title: "🧘 Quotes Bijak",
    desc: "Quotes bijak acak",
    output: "text"
})
