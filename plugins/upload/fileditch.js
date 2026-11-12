const { mediaLink, tool } = require("./_lib.js")

module.exports = tool({
    name: "fileditch",
    command: ["fileditch"],
    endpoint: "fileditch",
    desc: "Upload file ke FileDitch, dapat link",
    usage: "(kirim/reply file) atau <link file>",
    example: "https://example.com/file.zip",
    timeout: 180000,
    params: mediaLink(/./)
})
