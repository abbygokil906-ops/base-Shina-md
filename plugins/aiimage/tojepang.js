const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tojepang",
    command: ["tojepang"],
    endpoint: "tojepang",
    desc: "Foto jadi bergaya Jepang (versi lain)",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
