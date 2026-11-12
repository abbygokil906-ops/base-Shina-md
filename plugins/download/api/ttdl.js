const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "ttdl",
    command: ["ttdl", "tiktokdl"],
    endpoint: "tiktok",
    desc: "Download video/foto TikTok",
    usage: "<link tiktok>",
    example: "https://vt.tiktok.com/xxxx",
    needs: "text",
    output: "video",
    params: urlOnly()
})
