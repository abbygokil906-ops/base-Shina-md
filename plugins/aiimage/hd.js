const { tool } = require("./_lib.js")

module.exports = tool({
    name: "hd",
    command: ["hd", "hdimg"],
    endpoint: "hd",
    desc: "Tingkatkan kualitas gambar (upscaler 2x/3x/4x)",
    usage: "[2|3|4]  (kirim/reply foto)",
    example: "4",
    mode: "photo",
    options: [{ names: ["scale", "size", "upscale"], match: /^[234]x?$/i, strip: /x$/i }]
})
