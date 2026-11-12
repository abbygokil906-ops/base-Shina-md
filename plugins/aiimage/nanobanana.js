const { tool } = require("./_lib.js")

module.exports = tool({
    name: "nanobanana",
    command: ["nanobanana", "nbanana"],
    endpoint: "nanobanana",
    desc: "Edit foto dengan AI Nano Banana sesuai prompt",
    usage: "<prompt>  (kirim/reply foto)",
    example: "ubah bajunya jadi jas hitam",
    mode: "both",
    promptRequired: true
})
