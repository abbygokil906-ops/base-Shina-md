const { tool } = require("./_lib.js")

module.exports = tool({
    name: "text2img",
    command: ["text2img", "texttoimg"],
    endpoint: "text2img",
    desc: "Gambar AI dari prompt (opsi tambahan: key=value)",
    usage: "<prompt> [key=value]",
    example: "pemandangan sawah saat senja",
    needs: "text",
    mode: "prompt"
})
