const { tool, nameArg } = require("./_lib.js")

module.exports = tool({
    name: "artinama",
    command: ["artinama", "maknanama"],
    endpoint: "artinama",
    title: "🔤 Arti Nama",
    desc: "Cari arti dan makna sebuah nama",
    usage: "<nama>",
    example: "fuyuha",
    needs: "text",
    params: nameArg()
})
