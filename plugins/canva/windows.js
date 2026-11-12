const { tool, txt } = require("./_lib.js")

module.exports = tool({
    name: "windows",
    command: ["windows", "quoteswindows"],
    endpoint: "windows",
    desc: "Meme \"quotes Windows\" dari teks",
    usage: "<teks>",
    example: "kamu belum makan",
    needs: "text",
    fields: [
        txt("text", "teks")
    ]
})
