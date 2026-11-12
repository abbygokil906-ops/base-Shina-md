const { tool, txt, img, opt } = require("./_lib.js")

module.exports = tool({
    name: "igqc",
    command: ["igqc"],
    endpoint: "igqc",
    desc: "Fake chat Instagram (reaksi emoji, boleh pakai gambar)",
    usage: "<teks>|<emoji>  (foto opsional)",
    example: "halo semua|😂",
    needs: "text",
    fields: [
        txt("text", "message"),
        opt(txt("emoji", "reaction")),
        opt(img("image", "url"))
    ]
})
