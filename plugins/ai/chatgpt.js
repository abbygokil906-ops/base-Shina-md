const { tool } = require("./_lib.js")

module.exports = tool({
    name: "chatgpt",
    command: ["chatgpt"],
    endpoint: "chatgpt",
    desc: "ChatGPT: teks saja atau tambah gambar untuk dianalisis (kirim/reply foto)",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text",
    image: ["image", "url"]
})
