const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "facebook",
    command: ["facebook", "fb", "fbdl"],
    endpoint: "facebook",
    desc: "Download video Facebook HD + audio MP3",
    usage: "<link>",
    example: "https://www.facebook.com/reel/xxxx",
    needs: "text",
    output: "video",
    timeout: 180000,
    params: urlOnly()
})
