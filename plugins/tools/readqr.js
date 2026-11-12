const { mediaLink, tool } = require("./_lib.js")

module.exports = tool({
    name: "readqr",
    command: ["readqr"],
    endpoint: "readqr",
    desc: "Baca isi QR code dari gambar",
    usage: "(kirim/reply foto QR) atau <link gambar>",
    params: mediaLink(/image/, "url")
})
