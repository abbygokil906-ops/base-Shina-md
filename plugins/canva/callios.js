const { tool, txt, img, opt } = require("./_lib.js")

module.exports = tool({
    name: "callios",
    command: ["callios"],
    endpoint: "call-ios",
    desc: "Gambar panggilan WhatsApp iOS palsu",
    usage: "<nama>|<durasi>  (kirim/reply foto profil)",
    example: "Budi|00:35",
    fields: [
        txt("name", "nama"),
        img("avatar", "pp", "image", "url"),
        opt(txt("duration", "durasi"))
    ]
})
