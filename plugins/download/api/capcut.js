const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "capcut",
    command: ["capcut", "capcutdl"],
    endpoint: "capcut",
    desc: "Download template CapCut tanpa watermark",
    usage: "<link capcut>",
    example: "https://www.capcut.com/t/xxxx",
    needs: "text",
    output: "video",
    params: urlOnly()
})
