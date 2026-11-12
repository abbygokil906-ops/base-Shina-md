const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tobotak",
    command: ["tobotak"],
    endpoint: "tobotak",
    desc: "Foto jadi botak (rambut dihilangkan)",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
