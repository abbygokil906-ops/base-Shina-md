const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "snackvideo",
    command: ["snackvideo", "snack"],
    endpoint: "snackvideo",
    desc: "Download SnackVideo tanpa watermark",
    usage: "<link>",
    example: "https://s.snackvideo.com/xxxx",
    needs: "text",
    output: "video",
    params: urlOnly()
})
