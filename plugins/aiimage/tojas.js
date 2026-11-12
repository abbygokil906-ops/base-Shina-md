const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tojas",
    command: ["tojas"],
    endpoint: "tojas",
    desc: "Ganti pakaian jadi jas hitam formal + dasi",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
