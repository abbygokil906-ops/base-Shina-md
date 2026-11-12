const { tool } = require("./_lib.js")

module.exports = tool({
    name: "toliquor",
    command: ["toliquor"],
    endpoint: "toliquor",
    desc: "Foto dengan efek bertema liquor",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
