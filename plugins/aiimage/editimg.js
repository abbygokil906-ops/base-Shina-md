const { tool } = require("./_lib.js")

module.exports = tool({
    name: "editimg",
    command: ["editimg", "editfoto"],
    endpoint: "editimg",
    desc: "Edit gambar dengan AI (Flux Kontext) sesuai prompt; kosong = hapus teks di gambar",
    usage: "[prompt]  (kirim/reply foto)",
    example: "ubah latar jadi pantai",
    mode: "both"
})
