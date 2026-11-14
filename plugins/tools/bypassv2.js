const { tool, urlArg } = require("./_lib.js")

module.exports = tool({
    name: "bypassv2",
    command: ["bypassv2"],
    endpoint: "bypassv2",
    desc: "Bypass link shortener (versi 2)",
    usage: "<link>",
    example: "https://example.com/short",
    needs: "text",
    params: urlArg("url")
})
