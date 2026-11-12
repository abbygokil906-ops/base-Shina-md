const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "shopee",
    command: ["shopee", "shopeevideo"],
    endpoint: "shopee",
    desc: "Download Shopee Video",
    usage: "<link shopee video>",
    example: "https://sv.shopee.co.id/xxxx",
    needs: "text",
    output: "video",
    params: urlOnly()
})
