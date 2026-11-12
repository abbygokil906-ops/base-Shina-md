const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "aio",
    command: ["aio", "alldl"],
    endpoint: "aio",
    desc: "Download video/foto/audio dari banyak platform (TikTok, IG, FB, YT, Pinterest, X, Spotify, Threads, Douyin, Pixiv, TeraBox)",
    usage: "<link>",
    example: "https://vt.tiktok.com/xxxx",
    needs: "text",
    output: "auto",
    params: urlOnly()
})
