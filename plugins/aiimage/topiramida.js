const { tool } = require("./_lib.js")

module.exports = tool({
    name: "topiramida",
    command: ["topiramida"],
    endpoint: "topiramida",
    desc: "Foto dengan latar piramida",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
