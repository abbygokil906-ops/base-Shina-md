const { account, tool } = require("./_lib.js")

module.exports = tool({
    name: "stalktiktok",
    command: ["stalktiktok", "stalktt", "ttstalk"],
    endpoint: "stalk-tiktok",
    desc: "Info akun TikTok",
    usage: "<username>",
    example: "tiktok",
    needs: "text",
    output: "profile",
    params: account("username")
})
