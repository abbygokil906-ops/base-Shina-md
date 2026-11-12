const { tool } = require("./_lib.js")

module.exports = tool({
    name: "flux",
    command: ["flux"],
    endpoint: "flux",
    desc: "Gambar AI Flux dari prompt",
    usage: "<prompt>",
    example: "naga di atas gunung salju",
    needs: "text",
    mode: "prompt"
})
