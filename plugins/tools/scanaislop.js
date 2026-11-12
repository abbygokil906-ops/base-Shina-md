const { tool, urlArg } = require("./_lib.js")

module.exports = tool({
    name: "scanaislop",
    command: ["scanaislop"],
    endpoint: "scan-ai-slopweb",
    desc: "Deteksi website buatan AI asal-asalan",
    usage: "<link>",
    example: "https://example.com",
    needs: "text",
    timeout: 120000,
    params: urlArg("url")
})
