const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "instagram",
    command: ["instagram", "ig", "igdl"],
    endpoint: "instagram",
    desc: "Download foto/video/reel Instagram + caption",
    usage: "<link>",
    example: "https://www.instagram.com/p/xxxx",
    needs: "text",
    output: "auto",
    params: urlOnly()
})
