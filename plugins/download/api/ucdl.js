const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "ucdl",
    command: ["ucdl", "ucdrive"],
    endpoint: "uc-dl",
    desc: "Download file/video dari UC Drive Share (UC Browser)",
    usage: "<link uc drive>",
    example: "https://drive.uc.cn/s/xxxx",
    needs: "text",
    output: "document",
    timeout: 300000,
    params: urlOnly()
})
