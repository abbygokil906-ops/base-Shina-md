const { tool } = require("./_lib.js")

module.exports = tool({
    name: "toroblox",
    command: ["toroblox"],
    endpoint: "toroblox",
    desc: "Foto jadi gaya avatar Roblox 3D",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
