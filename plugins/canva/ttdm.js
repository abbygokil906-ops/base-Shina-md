const { tool, txt, img, opt } = require("./_lib.js")

module.exports = tool({
    name: "ttdm",
    command: ["ttdm"],
    endpoint: "ttdm",
    desc: "TikTok Streak DM (foto profil, username, api streak, pesan)",
    usage: "<username>|<pesan>  (kirim/reply foto profil)",
    example: "budi123|halo streak",
    fields: [
        txt("username", "name"),
        opt(txt("message", "text")),
        img("avatar", "pp", "image", "url")
    ]
})
