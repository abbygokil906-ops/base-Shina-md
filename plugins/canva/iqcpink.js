const { tool, txt, opt } = require("./_lib.js")

module.exports = tool({
    name: "iqcpink",
    command: ["iqcpink"],
    endpoint: "iqcpink",
    desc: "Chat iPhone mode pink",
    usage: "<teks>|<jam>",
    example: "halo|09:41",
    needs: "text",
    fields: [
        txt("text", "message"),
        opt(txt("time", "jam"))
    ]
})
