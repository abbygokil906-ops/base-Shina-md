const { tool, img } = require("./_lib.js")

module.exports = tool({
    name: "meledak",
    command: ["meledak"],
    endpoint: "meledak",
    desc: "Tempel foto/stiker ke latar adegan ledakan (background otomatis dihapus)",
    usage: "(kirim/reply foto)",
    fields: [
        img("url", "image", "photo")
    ]
})
