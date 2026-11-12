const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tokacamata",
    command: ["tokacamata"],
    endpoint: "tokacamata",
    desc: "Tambahkan kacamata pada karakter di foto",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
