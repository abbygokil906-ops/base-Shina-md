const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tomanga",
    command: ["tomanga"],
    endpoint: "tomanga",
    desc: "Foto jadi gaya komik manga Jepang",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
