const { mediaLink, tool } = require("./_lib.js")

module.exports = tool({
    name: "vid2prompt",
    command: ["vid2prompt"],
    endpoint: "vid2prompt",
    desc: "Video jadi prompt (deskripsi AI)",
    usage: "(kirim/reply video) atau <link video>",
    timeout: 180000,
    params: mediaLink(/video/, "url")
})
