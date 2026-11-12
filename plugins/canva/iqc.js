const { tool, txt, img, opt } = require("./_lib.js")

module.exports = tool({
    name: "iqc",
    command: ["iqc"],
    endpoint: "iqc",
    desc: "Chat iPhone mode gelap",
    usage: "<teks>|<jam>  (foto opsional)",
    example: "halo|09:41",
    needs: "text",
    fields: [
        txt("text", "message"),
        opt(txt("time", "jam")),
        opt(img("image", "url"))
    ]
})
