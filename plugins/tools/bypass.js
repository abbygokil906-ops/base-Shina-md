const { tool, urlArg } = require("./_lib.js")

module.exports = tool({
    name: "bypass",
    command: ["bypass"],
    endpoint: "bypass",
    desc: "Bypass link shortener",
    usage: "<link>",
    example: "https://example.com/short",
    needs: "text",
    params: urlArg("url")
})
