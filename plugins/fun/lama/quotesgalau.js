const { tool } = require("./_lib.js")

module.exports = tool({
    name: "quotesgalau",
    command: ["quotesgalau", "galau"],
    endpoint: "quotes-galau",
    title: "Quotes Galau",
    desc: "Ngaoain galau sih? mending mabar hayuk",
    output: "text"
})
