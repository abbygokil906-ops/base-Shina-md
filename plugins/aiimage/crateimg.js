const { tool } = require("./_lib.js")

module.exports = tool({
    name: "crateimg",
    command: ["crateimg", "createimg"],
    endpoint: "crateimg",
    desc: "Gambar AI dari teks (pilih model, ukuran, format: model=... size=... format=...)",
    usage: "<prompt> [model=..] [size=..] [format=..]",
    example: "kucing astronot di bulan",
    needs: "text",
    mode: "prompt"
})
