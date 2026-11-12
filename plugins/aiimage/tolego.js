const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tolego",
    command: ["tolego"],
    endpoint: "tolego",
    desc: "Karakter di foto jadi minifigure LEGO",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
