const { tool } = require("./_lib.js")

module.exports = tool({
    name: "topantai",
    command: ["topantai"],
    endpoint: "topantai",
    desc: "Potret full body di pantai saat golden hour, langit sunset aesthetic",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
