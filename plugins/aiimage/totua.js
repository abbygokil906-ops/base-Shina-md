const { tool } = require("./_lib.js")

module.exports = tool({
    name: "totua",
    command: ["totua"],
    endpoint: "totua",
    desc: "Foto jadi terlihat tua",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
