const { tool } = require("./_lib.js")

module.exports = tool({
    name: "longteks",
    command: ["longteks", "longtext"],
    endpoint: "longteks",
    title: "Teks Romantis",
    desc: "Teks panjang romantis acak untuk pasangan",
    output: "text"
})
