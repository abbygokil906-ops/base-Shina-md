const { mediaLink, tool } = require("./_lib.js")

module.exports = tool({
    name: "ceknsfw",
    command: ["ceknsfw"],
    endpoint: "cek-nsfw",
    desc: "Cek apakah gambar mengandung NSFW",
    usage: "(kirim/reply foto) atau <link gambar>",
    params: mediaLink(/image/, "image")
})
