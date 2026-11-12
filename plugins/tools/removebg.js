const { mediaLink, tool } = require("./_lib.js")

module.exports = tool({
    name: "removebg",
    command: ["removebg", "rbg"],
    endpoint: "removebg",
    desc: "Hapus background foto",
    usage: "(kirim/reply foto) atau <link gambar>",
    output: "image",
    timeout: 120000,
    params: mediaLink(/image/, "url")
})
