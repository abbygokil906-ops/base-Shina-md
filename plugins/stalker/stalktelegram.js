const { account, tool } = require("./_lib.js")

module.exports = tool({
    name: "stalktelegram",
    command: ["stalktelegram", "stalktg"],
    endpoint: "stalk-telegram",
    desc: "Info akun / channel Telegram",
    usage: "<username>",
    example: "telegram",
    needs: "text",
    output: "profile",
    params: account("username")
})
