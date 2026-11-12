const { tool } = require("./_lib.js")

module.exports = tool({
    name: "topeci",
    command: ["topeci"],
    endpoint: "topeci",
    desc: "Tambahkan peci hitam pada karakter di foto",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
