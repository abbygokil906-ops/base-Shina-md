const { tool, txt } = require("./_lib.js")

module.exports = tool({
    name: "balogo",
    command: ["balogo", "bluearchivelogo"],
    endpoint: "balogo",
    desc: "Logo gaya Blue Archive (teks kiri & kanan)",
    usage: "<teks kiri>|<teks kanan>",
    example: "Fuyuha|MD",
    needs: "text",
    fields: [
        txt("textL", "text1", "left", "kiri"),
        txt("textR", "text2", "right", "kanan")
    ]
})
