const { account, tool } = require("./_lib.js")

module.exports = tool({
    name: "stalkthreads",
    command: ["stalkthreads", "threadsstalk"],
    endpoint: "stalk-threads",
    desc: "Info akun Threads",
    usage: "<username>",
    example: "zuck",
    needs: "text",
    output: "profile",
    params: account("username")
})
