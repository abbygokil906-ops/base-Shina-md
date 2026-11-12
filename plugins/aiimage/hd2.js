const { tool } = require("./_lib.js")

module.exports = tool({
    name: "hd2",
    command: ["hd2"],
    endpoint: "hd2",
    desc: "Tingkatkan kualitas gambar dengan AI agar tidak blur",
    usage: "(kirim/reply foto)",
    mode: "photo"
})
