const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tofigurav2",
    command: ["tofigurav2"],
    endpoint: "tofigurav2",
    desc: "Foto jadi action figure (figura) gaya versi 2",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
