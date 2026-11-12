const { account, tool } = require("./_lib.js")

module.exports = tool({
    name: "stalkgh",
    command: ["stalkgh", "githubstalk"],
    endpoint: "stalk-gh",
    desc: "Info akun GitHub",
    usage: "<username>",
    example: "torvalds",
    needs: "text",
    output: "profile",
    params: account("username")
})
