const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "tiktok2",
    command: ["tiktok2", "tt2", "ttnowm"],
    endpoint: "tiktok2",
    desc: "Download TikTok tanpa watermark + audio (versi 2, support tt.site)",
    usage: "<link tiktok>",
    example: "https://vt.tiktok.com/xxxx",
    needs: "text",
    output: "video",
    params: urlOnly()
})
