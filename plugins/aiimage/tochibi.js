const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tochibi",
    command: ["tochibi"],
    endpoint: "tochibi",
    desc: "Karakter di foto jadi gaya chibi yang imut",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
