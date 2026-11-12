const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tofunk",
    command: ["tofunk"],
    endpoint: "tofunk",
    desc: "Foto jadi figur gaya Funko Pop",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
