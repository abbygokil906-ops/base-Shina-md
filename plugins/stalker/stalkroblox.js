const { account, tool } = require("./_lib.js")

module.exports = tool({
    name: "stalkroblox",
    command: ["stalkroblox", "robloxstalk"],
    endpoint: "stalk-roblox",
    desc: "Info akun Roblox",
    usage: "<username>",
    example: "Roblox",
    needs: "text",
    output: "profile",
    params: account("username")
})
