const { mediaLink, tool } = require("./_lib.js")

module.exports = tool({
    name: "whatmusic",
    command: ["whatmusic"],
    endpoint: "whatmusic",
    desc: "Cari judul lagu dari audio/video",
    usage: "(kirim/reply audio atau video) atau <link>",
    timeout: 120000,
    params: mediaLink(/audio|video/, "url")
})
