const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "mediafire",
    command: ["mediafire", "mf"],
    endpoint: "mediafire",
    desc: "Download file Mediafire",
    usage: "<link>",
    example: "https://www.mediafire.com/file/xxxx",
    needs: "text",
    output: "document",
    timeout: 300000,
    params: urlOnly()
})
