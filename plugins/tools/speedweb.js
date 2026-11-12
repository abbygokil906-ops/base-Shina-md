const { tool, urlPlus } = require("./_lib.js")

module.exports = tool({
    name: "speedweb",
    command: ["speedweb"],
    endpoint: "speed-web",
    desc: "Tes kecepatan website per region",
    usage: "<link> [region]",
    example: "https://example.com ap-northeast-1",
    needs: "text",
    timeout: 120000,
    params: urlPlus("region", "ap-northeast-1")
})
