const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tofigure",
    command: ["tofigure"],
    endpoint: "tofigure",
    desc: "Foto jadi figurine skala 1/7 di meja komputer + box ala Bandai",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
