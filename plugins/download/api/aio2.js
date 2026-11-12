const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "aio2",
    command: ["aio2", "alldl2"],
    endpoint: "aio2",
    desc: "Download video/foto/audio dari banyak platform lewat satu link (versi 2)",
    usage: "<link>",
    example: "https://www.instagram.com/reel/xxxx",
    needs: "text",
    output: "auto",
    params: urlOnly()
})
