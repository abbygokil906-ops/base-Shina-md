const { tool } = require("./_lib.js")

module.exports = tool({
    name: "imagetoprompt",
    command: ["imagetoprompt", "img2prompt", "toprompt"],
    endpoint: "imagetoprompt",
    title: "📝 Image to Prompt",
    desc: "Ubah gambar jadi prompt teks",
    usage: "(kirim/reply foto)",
    mode: "photo",
    output: "text"
})
