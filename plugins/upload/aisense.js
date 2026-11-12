const { mediaLink, tool } = require("./_lib.js")

module.exports = tool({
    name: "aisense",
    command: ["aisense"],
    endpoint: "aisense",
    desc: "Upload file ke AISense, dapat link",
    usage: "(kirim/reply file) atau <link file>",
    example: "https://example.com/file.zip",
    timeout: 180000,
    params: mediaLink(/./)
})
