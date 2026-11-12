const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "pindl",
    command: ["pindl", "pindownload"],
    endpoint: "pindl",
    desc: "Download gambar/video Pinterest dari link",
    usage: "<link pin>",
    example: "https://pin.it/xxxx",
    needs: "text",
    output: "auto",
    params: urlOnly()
})
