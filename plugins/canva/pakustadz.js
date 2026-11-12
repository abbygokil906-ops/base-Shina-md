const { tool, txt } = require("./_lib.js")

module.exports = tool({
    name: "pakustadz",
    command: ["pakustadz", "ustadz"],
    endpoint: "pakustadz",
    desc: "Meme Pak Ustadz dengan tulisan buatanmu",
    usage: "<teks>",
    example: "jangan lupa sholat",
    needs: "text",
    fields: [
        txt("text", "teks")
    ]
})
