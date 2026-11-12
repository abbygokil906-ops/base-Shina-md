const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "twitterdl",
    command: ["twitter", "twitterdl", "twdl", "xdl"],
    endpoint: "twitterdl",
    desc: "Download video/gambar dari tweet Twitter/X",
    usage: "<link tweet>",
    example: "https://x.com/user/status/123",
    needs: "text",
    output: "auto",
    params: urlOnly()
})
