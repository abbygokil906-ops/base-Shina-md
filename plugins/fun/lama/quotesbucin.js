const { tool } = require("./_lib.js")

module.exports = tool({
    name: "quotesbucin",
    command: ["quotesbucin", "bucin"],
    endpoint: "quotes-bucin",
    title: "Quotes Bucin",
    desc: "Quotes bucin acak",
    output: "text"
})
