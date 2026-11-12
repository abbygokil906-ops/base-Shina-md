const { tool, urlArg } = require("./_lib.js")

module.exports = tool({
    name: "cekphising",
    command: ["cekphising"],
    endpoint: "cekphising",
    desc: "Cek apakah link berbahaya / phising",
    usage: "<link>",
    example: "https://example.com",
    needs: "text",
    params: urlArg("url")
})
