const { one, tool } = require("./_lib.js")

module.exports = tool({
    name: "txt2video",
    command: ["txt2video"],
    endpoint: "txt2video",
    desc: "Teks jadi video (AI)",
    usage: "<prompt>",
    example: "pantai saat matahari terbenam",
    needs: "text",
    output: "video",
    timeout: 300000,
    params: one("prompt")
})
