const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "youtubedl",
    command: ["youtubedl", "ytdl"],
    endpoint: "youtube-dl",
    desc: "Download video YouTube (pilih kualitas: tambah angka, default <=720p)",
    usage: "<link> [kualitas]",
    example: "https://youtu.be/xxxx 480",
    needs: "text",
    output: "video",
    timeout: 300000,
    params: urlOnly()
})
