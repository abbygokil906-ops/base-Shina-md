const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tohijab",
    command: ["tohijab"],
    endpoint: "tohijab",
    desc: "Tambahkan hijab pada karakter di foto",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
