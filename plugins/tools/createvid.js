const { one, tool } = require("./_lib.js")

module.exports = tool({
    name: "createvid",
    command: ["createvid"],
    endpoint: "createvid",
    desc: "Buat video dari prompt (AI)",
    usage: "<prompt>",
    example: "kucing menari di atas bulan",
    needs: "text",
    output: "video",
    timeout: 300000,
    params: one("prompt")
})
