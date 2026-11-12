const { tool, txt } = require("./_lib.js")

module.exports = tool({
    name: "ffgirl",
    command: ["ffgirl"],
    endpoint: "ffgirl",
    desc: "Kartu karakter cewek Free Fire",
    usage: "<username>",
    example: "Fuyuha",
    needs: "text",
    fields: [
        txt("username", "name", "nickname")
    ]
})
