const { tool, urlArg } = require("./_lib.js")

module.exports = tool({
    name: "ssweb",
    command: ["ssweb", "ss"],
    endpoint: "ssweb",
    desc: "Screenshot website",
    usage: "<link>",
    example: "https://example.com",
    needs: "text",
    output: "image",
    params: urlArg("url")
})
