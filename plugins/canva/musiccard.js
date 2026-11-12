const { tool, txt, img } = require("./_lib.js")

module.exports = tool({
    name: "musiccard",
    command: ["musiccard"],
    endpoint: "musiccard",
    desc: "Kartu pemutar musik (cover, judul, artis)",
    usage: "<judul>|<artis>  (kirim/reply foto cover)",
    example: "Faded|Alan Walker",
    fields: [
        txt("title", "judul"),
        txt("artist", "artis"),
        img("cover", "image", "url")
    ]
})
