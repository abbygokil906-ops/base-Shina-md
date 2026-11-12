const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tonikah",
    command: ["tonikah"],
    endpoint: "tonikah",
    desc: "Foto jadi suasana pernikahan di pelaminan bersama pasangan",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
