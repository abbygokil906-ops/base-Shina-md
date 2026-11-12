const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tosma",
    command: ["tosma"],
    endpoint: "tosma",
    desc: "Foto jadi memakai seragam SMA",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
