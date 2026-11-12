const { tool, urlArg } = require("./_lib.js")

module.exports = tool({
    name: "ouobypass",
    command: ["ouobypass", "ouo"],
    endpoint: "ouo-io-bypass",
    desc: "Bypass link ouo.io",
    usage: "<link ouo.io>",
    example: "https://ouo.io/xxxx",
    needs: "text",
    params: urlArg("url")
})
