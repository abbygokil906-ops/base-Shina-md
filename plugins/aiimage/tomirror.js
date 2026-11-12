const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tomirror",
    command: ["tomirror"],
    endpoint: "tomirror",
    desc: "Foto jadi mirror selfie dengan latar gorden abu-abu",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
