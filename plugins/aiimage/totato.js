const { tool } = require("./_lib.js")

module.exports = tool({
    name: "totato",
    command: ["totato"],
    endpoint: "totato",
    desc: "Tambahkan tato pada wajah dan kulit karakter di foto",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
