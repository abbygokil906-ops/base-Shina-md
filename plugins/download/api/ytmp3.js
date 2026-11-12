const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "ytmp3",
    command: ["ytmp3", "yta"],
    endpoint: "ytmp3",
    desc: "Download audio MP3 dari video YouTube",
    usage: "<link>",
    example: "https://youtu.be/xxxx",
    needs: "text",
    output: "audio",
    timeout: 300000,
    params: urlOnly()
})
