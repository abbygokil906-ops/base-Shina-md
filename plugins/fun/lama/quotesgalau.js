const { tool } = require("./_lib.js")

module.exports = tool({
    name: "quotesgalau",
    command: ["quotesgalau", "galau"],
    endpoint: "quotes-galau",
    title: "💔 Quotes Galau",
    desc: "Quotes galau acak",
    output: "text"
})
