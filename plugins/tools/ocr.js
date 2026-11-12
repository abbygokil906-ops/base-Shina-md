const { mediaLink, tool } = require("./_lib.js")

module.exports = tool({
    name: "ocr",
    command: ["ocr"],
    endpoint: "ocr",
    desc: "Ambil teks dari gambar",
    usage: "(kirim/reply foto) atau <link gambar>",
    timeout: 120000,
    params: mediaLink(/image/, "url")
})
