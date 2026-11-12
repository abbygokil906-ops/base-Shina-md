const { number, tool } = require("./_lib.js")

module.exports = tool({
    name: "stalkff",
    command: ["stalkff", "ffstalk"],
    endpoint: "stalk-ff",
    desc: "Info akun Free Fire",
    usage: "<uid>",
    example: "19832466572",
    needs: "text",
    output: "profile",
    params: number("uid")
})
