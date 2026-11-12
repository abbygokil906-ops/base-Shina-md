const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "ytmp4",
    command: ["ytmp4", "ytv"],
    endpoint: "ytmp4",
    desc: "Download video YouTube (pilih kualitas: tambah angka, default <=720p)",
    usage: "<link> [kualitas]",
    example: "https://youtu.be/xxxx 360",
    needs: "text",
    output: "video",
    timeout: 300000,
    params: urlOnly()
})
