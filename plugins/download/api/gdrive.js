const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "gdrive",
    command: ["gdrive", "gdl"],
    endpoint: "gdrive",
    desc: "Download file Google Drive (link publik)",
    usage: "<link>",
    example: "https://drive.google.com/file/d/xxxx/view",
    needs: "text",
    output: "document",
    timeout: 300000,
    params: urlOnly()
})
