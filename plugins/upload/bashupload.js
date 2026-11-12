const { mediaLink, tool } = require("./_lib.js")

module.exports = tool({
    name: "bashupload",
    command: ["bashupload"],
    endpoint: "bashupload",
    desc: "Upload file ke Bashupload, dapat link",
    usage: "(kirim/reply file) atau <link file>",
    example: "https://example.com/file.zip",
    timeout: 180000,
    params: mediaLink(/./)
})
