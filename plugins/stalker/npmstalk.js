const { one, tool } = require("./_lib.js")

module.exports = tool({
    name: "npmstalk",
    command: ["npmstalk", "stalknpm"],
    endpoint: "npm-stalk",
    desc: "Info package NPM",
    usage: "<nama package>",
    example: "baileys",
    needs: "text",
    params: one("name")
})
