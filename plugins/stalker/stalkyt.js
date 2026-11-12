const { account, tool } = require("./_lib.js")

module.exports = tool({
    name: "stalkyt",
    command: ["stalkyt", "stalkyoutube", "ytstalk"],
    endpoint: "stalk-yt",
    desc: "Info channel YouTube",
    usage: "<username channel>",
    example: "MrBeast",
    needs: "text",
    output: "profile",
    params: account("username")
})
