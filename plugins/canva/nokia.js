const { tool, txt, opt } = require("./_lib.js")

module.exports = tool({
    name: "nokia",
    command: ["nokia"],
    endpoint: "nokia",
    desc: "SMS ala HP Nokia jadul",
    usage: "<pesan>|<pengirim>|<tanggal>|<jam>",
    example: "halo apa kabar|Budi|01/01/2026|10:00",
    needs: "text",
    fields: [
        txt("message", "text", "pesan"),
        opt(txt("sender", "pengirim", "from")),
        opt(txt("date", "tanggal")),
        opt(txt("time", "jam"))
    ]
})
