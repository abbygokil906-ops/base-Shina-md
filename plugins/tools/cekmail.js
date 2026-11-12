const { one, tool } = require("./_lib.js")

module.exports = tool({
    name: "cekmail",
    command: ["cekmail"],
    endpoint: "cekmail",
    desc: "Cek kotak masuk email (pakai token)",
    usage: "<token>",
    example: "abc123",
    needs: "text",
    params: one("token")
})
