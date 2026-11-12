const { mediaLink, tool } = require("./_lib.js")

module.exports = tool({
    name: "transkripsi",
    command: ["transkripsi"],
    endpoint: "transkripsi",
    desc: "Ubah suara/video jadi teks",
    usage: "(kirim/reply audio atau video) atau <link>",
    timeout: 180000,
    params: mediaLink(/audio|video/, "url")
})
