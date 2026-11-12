const { tool } = require("./_lib.js")

module.exports = tool({
    name: "pap",
    command: ["pap"],
    endpoint: "pap",
    title: "📸 Pap",
    desc: "Gambar pap acak dari Pinterest",
    output: "image"
})
