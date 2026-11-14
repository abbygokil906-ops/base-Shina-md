const { one, tool } = require("./_lib.js")

module.exports = tool({
    name: "trackip",
    command: ["trackip"],
    endpoint: "trackip",
    desc: "Lacak lokasi IP",
    usage: "<ip>",
    example: "8.8.8.8",
    needs: "text",
    params: one("ip")
})
