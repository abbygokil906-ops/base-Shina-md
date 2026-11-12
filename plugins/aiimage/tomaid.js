const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tomaid",
    command: ["tomaid"],
    endpoint: "tomaid",
    desc: "Foto jadi memakai pakaian maid",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
