const { tool, txt, img, opt } = require("./_lib.js")

module.exports = tool({
    name: "igstory",
    command: ["igstory"],
    endpoint: "ig-story",
    desc: "Tampilan Instagram Story (foto profil, nama, username)",
    usage: "<nama>|<username>|<teks>  (kirim/reply foto profil)",
    example: "Budi|budi.id|halo",
    fields: [
        txt("name", "nama"),
        txt("username"),
        opt(txt("text", "caption")),
        img("avatar", "pp", "image", "url")
    ]
})
