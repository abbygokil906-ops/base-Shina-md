const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tooutfit",
    command: ["tooutfit"],
    endpoint: "tooutfit",
    desc: "Ganti pakaian jadi outfit lebih keren & premium (wajah dan pose tetap)",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
