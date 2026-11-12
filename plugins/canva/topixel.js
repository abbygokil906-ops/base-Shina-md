const { tool, txt, img, opt } = require("./_lib.js")

module.exports = tool({
    name: "topixel",
    command: ["topixel", "pixelart"],
    endpoint: "topixel",
    desc: "Ubah foto jadi pixel art",
    usage: "<tingkat piksel>  (kirim/reply foto)",
    example: "10",
    fields: [
        img("url", "image", "photo"),
        opt(txt("size", "pixel", "level"))
    ]
})
