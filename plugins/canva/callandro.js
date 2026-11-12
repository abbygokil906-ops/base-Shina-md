const { tool, txt, img, opt } = require("./_lib.js")

module.exports = tool({
    name: "callandro",
    command: ["callandro"],
    endpoint: "call-andro",
    desc: "Gambar panggilan WhatsApp Android palsu",
    usage: "<nama>|<durasi>  (kirim/reply foto profil)",
    example: "Budi|00:35",
    fields: [
        txt("name", "nama"),
        img("avatar", "pp", "image", "url"),
        opt(txt("duration", "durasi"))
    ]
})
