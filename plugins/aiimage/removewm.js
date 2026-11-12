const { tool } = require("./_lib.js")

module.exports = tool({
    name: "removewm",
    command: ["removewm", "removewatermark", "rmwm"],
    endpoint: "remove-wm",
    desc: "Hapus watermark dari gambar dengan AI",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
