const { tool } = require("./_lib.js")

module.exports = tool({
    name: "toreal",
    command: ["toreal"],
    endpoint: "toreal",
    desc: "Gambar jadi tampilan realistis seperti foto asli",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
