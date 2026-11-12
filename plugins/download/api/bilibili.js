const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "bilibili",
    command: ["bilibili", "bstation"],
    endpoint: "bilibili",
    desc: "Download video Bilibili",
    usage: "<link>",
    example: "https://www.bilibili.com/video/BV1xxxx",
    needs: "text",
    output: "video",
    timeout: 180000,
    params: urlOnly()
})
