const { tool, urlArg } = require("./_lib.js")

module.exports = tool({
    name: "bypasssfl",
    command: ["bypasssfl"],
    endpoint: "bypass-sfl",
    desc: "Bypass link SFL",
    usage: "<link>",
    example: "https://sfl.gl/xxxx",
    needs: "text",
    params: urlArg("url")
})
