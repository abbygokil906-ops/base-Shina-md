const { account, tool } = require("./_lib.js")

module.exports = tool({
    name: "stalkig",
    command: ["stalkig", "igstalk"],
    endpoint: "stalk-ig",
    desc: "Info akun Instagram",
    usage: "<username>",
    example: "instagram",
    needs: "text",
    output: "profile",
    params: account("username")
})
