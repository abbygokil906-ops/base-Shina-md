const { one, tool } = require("./_lib.js")

module.exports = tool({
    name: "qrcode",
    command: ["qrcode", "qr"],
    endpoint: "qrcode",
    desc: "Buat QR code dari teks / link",
    usage: "<teks>",
    example: "https://example.com",
    needs: "text",
    output: "image",
    params: one("text")
})
