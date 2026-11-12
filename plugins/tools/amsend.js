const { one, tool } = require("./_lib.js")

module.exports = tool({
    name: "amsend",
    command: ["amsend"],
    endpoint: "am-send",
    desc: "Kirim magic link verifikasi ke email (AM)",
    usage: "<email>",
    example: "nama@gmail.com",
    needs: "text",
    params: one("email")
})
