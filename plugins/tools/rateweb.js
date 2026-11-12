const { tool, urlPlus } = require("./_lib.js")

module.exports = tool({
    name: "rateweb",
    command: ["rateweb"],
    endpoint: "rateweb",
    desc: "Nilai performa website (mobile/desktop/both)",
    usage: "<link> [mobile|desktop|both]",
    example: "https://example.com mobile",
    needs: "text",
    timeout: 120000,
    params: urlPlus("strategy", "both", ["mobile", "desktop", "both"])
})
