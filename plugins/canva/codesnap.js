const { tool, txt, opt } = require("./_lib.js")

module.exports = tool({
    name: "codesnap",
    command: ["codesnap", "carbon"],
    endpoint: "codesnap",
    desc: "Potongan kode jadi gambar ala Carbon",
    usage: "<kode>|<bahasa>|<tema>|<background>|<judul>  (atau reply pesan berisi kode)",
    example: "console.log('halo')|javascript|dracula",
    needs: "text",
    fields: [
        txt("code"),
        opt(txt("language", "lang")),
        opt(txt("theme")),
        opt(txt("background", "bg")),
        opt(txt("title"))
    ]
})
