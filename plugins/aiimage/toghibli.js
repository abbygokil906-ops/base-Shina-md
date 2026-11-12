const { tool } = require("./_lib.js")

module.exports = tool({
    name: "toghibli",
    command: ["toghibli"],
    endpoint: "toghibli",
    desc: "Foto jadi gaya animasi Studio Ghibli",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
