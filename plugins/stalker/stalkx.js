const { account, tool } = require("./_lib.js")

module.exports = tool({
    name: "stalkx",
    command: ["stalkx", "stalktwitter", "xstalk"],
    endpoint: "stalk-x",
    desc: "Info akun X (Twitter)",
    usage: "<username>",
    example: "x",
    needs: "text",
    output: "profile",
    params: account("username")
})
