const { tool, urlPlus } = require("./_lib.js")

module.exports = tool({
    name: "recordweb",
    command: ["recordweb"],
    endpoint: "recordweb",
    desc: "Rekam video website",
    usage: "<link> [device]",
    example: "https://example.com desktop_4k",
    needs: "text",
    output: "video",
    timeout: 240000,
    params: urlPlus("device", "desktop_4k")
})
