const { tool, urlArg } = require("./_lib.js")

module.exports = tool({
    name: "sub2unlock",
    command: ["sub2unlock"],
    endpoint: "sub2unlock",
    desc: "Buka link sub2unlock",
    usage: "<link>",
    example: "https://sub2unlock.com/xxxx",
    needs: "text",
    params: urlArg("url")
})
