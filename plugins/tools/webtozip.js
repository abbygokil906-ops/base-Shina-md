const { tool, urlArg } = require("./_lib.js")

module.exports = tool({
    name: "webtozip",
    command: ["webtozip"],
    endpoint: "webtozip",
    desc: "Download website jadi ZIP",
    usage: "<link>",
    example: "https://example.com",
    needs: "text",
    output: "document",
    timeout: 240000,
    params: urlArg("url")
})
