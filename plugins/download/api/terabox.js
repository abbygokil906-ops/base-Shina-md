const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "terabox",
    command: ["terabox", "tb"],
    endpoint: "terabox",
    desc: "Download file dari link Terabox",
    usage: "<link>",
    example: "https://terabox.com/s/xxxx",
    needs: "text",
    output: "document",
    timeout: 300000,
    params: urlOnly()
})
