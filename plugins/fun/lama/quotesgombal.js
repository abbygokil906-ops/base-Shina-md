const { tool } = require("./_lib.js")

module.exports = tool({
    name: "quotesgombal",
    command: ["quotesgombal", "gombal"],
    endpoint: "quotes-gombal",
    title: "😘 Gombalan",
    desc: "Gombalan receh acak",
    output: "text"
})
