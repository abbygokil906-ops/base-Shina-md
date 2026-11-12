const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "igmp3",
    command: ["igmp3", "igaudio"],
    endpoint: "igmp3",
    desc: "Ambil audio MP3 dari Instagram Reel",
    usage: "<link reel>",
    example: "https://www.instagram.com/reel/xxxx",
    needs: "text",
    output: "audio",
    params: urlOnly()
})
