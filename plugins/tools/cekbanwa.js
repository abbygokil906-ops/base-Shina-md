const { number, tool } = require("./_lib.js")

module.exports = tool({
    name: "cekbanwa",
    command: ["cekbanwa"],
    endpoint: "cekban-wa",
    desc: "Cek apakah nomor WhatsApp terkena banned",
    usage: "<nomor>",
    example: "628123456789",
    needs: "text",
    params: number("number")
})
