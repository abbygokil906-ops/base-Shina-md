const { tool } = require("./_lib.js")

module.exports = tool({
    name: "ihancer",
    command: ["ihancer"],
    endpoint: "ihancer",
    desc: "Tingkatkan kualitas gambar Ihancer: standard, sharpen, restore, ultra",
    usage: "[standard|sharpen|restore|ultra]  (kirim/reply foto)",
    example: "ultra",
    mode: "photo",
    options: [{ names: ["method", "mode", "type"], match: ["standard", "sharpen", "restore", "ultra"] }]
})
