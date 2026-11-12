const { tool } = require("./_lib.js")

module.exports = tool({
    name: "topacar",
    command: ["topacar"],
    endpoint: "topacar",
    desc: "Tambahkan pasangan di samping karakter pada foto",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
