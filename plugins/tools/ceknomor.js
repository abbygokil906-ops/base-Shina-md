const { number, tool } = require("./_lib.js")

module.exports = tool({
    name: "ceknomor",
    command: ["ceknomor"],
    endpoint: "ceknomor-operator",
    desc: "Cek operator nomor HP",
    usage: "<nomor>",
    example: "08123456789",
    needs: "text",
    params: number("number")
})
