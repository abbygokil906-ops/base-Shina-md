const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tofigurav3",
    command: ["tofigurav3"],
    endpoint: "tofigurav3",
    desc: "Foto jadi action figure (figura) gaya versi 3",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
