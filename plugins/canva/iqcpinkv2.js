const { tool, txt, img, opt } = require("./_lib.js")

module.exports = tool({
    name: "iqcpinkv2",
    command: ["iqcpinkv2"],
    endpoint: "iqcpinkv2",
    desc: "Chat iPhone mode pink v2 (gambar, reaksi emoji, menu pesan)",
    usage: "<teks>|<emoji>|<menu>|<jam>  (foto opsional)",
    example: "halo|❤️|Reply,Copy|09:41",
    needs: "text",
    fields: [
        txt("text", "message"),
        opt(txt("emoji", "reaction")),
        opt(txt("menu")),
        opt(txt("time", "jam")),
        opt(img("image", "url"))
    ]
})
