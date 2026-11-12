const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "amdl",
    command: ["amdl", "alightmotion"],
    endpoint: "am-dl",
    desc: "Download project/preset Alight Motion (zip)",
    usage: "<link alight motion>",
    example: "https://alightcreative.com/am/xxxx",
    needs: "text",
    output: "document",
    timeout: 180000,
    params: urlOnly()
})
