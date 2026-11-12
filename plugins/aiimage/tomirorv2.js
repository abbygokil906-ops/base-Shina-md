const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tomirorv2",
    command: ["tomirorv2", "tomirrorv2"],
    endpoint: "tomirorv2",
    desc: "Foto jadi mirror selfie di kamar mandi sambil pegang smartphone",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
