const { tool } = require("./_lib.js")

module.exports = tool({
    name: "mirrormacbook",
    command: ["mirrormacbook", "macbook"],
    endpoint: "mirror-Macbook",
    desc: "Foto jadi mirror selfie di depan layar MacBook (hoodie hitam oversized, kamar remang)",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
