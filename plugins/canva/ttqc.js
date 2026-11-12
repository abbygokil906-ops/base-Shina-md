const { tool, txt, img, opt } = require("./_lib.js")

module.exports = tool({
    name: "ttqc",
    command: ["ttqc"],
    endpoint: "ttqc",
    desc: "Fake chat TikTok (quote chat + menu tekan-lama)",
    usage: "<teks>|<nama>  (foto profil opsional)",
    example: "halo|Budi",
    needs: "text",
    fields: [
        txt("text", "message"),
        opt(txt("name", "username")),
        opt(img("avatar", "pp", "image", "url"))
    ]
})
