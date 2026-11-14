const { tool, urlPlus } = require("./_lib.js")

module.exports = tool({
    name: "shortlink",
    command: ["shortlink"],
    endpoint: "shortlink",
    desc: "Perpendek link (alias opsional)",
    usage: "<link> [alias]",
    example: "https://example.com/halaman-panjang nihilux",
    needs: "text",
    params: urlPlus("custom", undefined)
})
