const { tool, queryOnly } = require("./_lib.js")

module.exports = tool({
    name: "ytplay",
    command: ["ytplay", "play3"],
    endpoint: "play",
    desc: "Download audio MP3 YouTube lewat judul / kata kunci",
    usage: "<judul lagu>",
    example: "alan walker faded",
    needs: "text",
    output: "audio",
    timeout: 180000,
    params: queryOnly()
})
