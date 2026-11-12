const { tool } = require("./_lib.js")

module.exports = tool({
    name: "notegptnano",
    command: ["notegptnano", "nanobanana", "nano"],
    endpoint: "notegpt-nano",
    desc: "Edit gambar dengan Nano Banana (NoteGPT) sesuai prompt",
    usage: "<prompt>  (kirim/reply foto)",
    example: "jadikan gaya anime",
    mode: "both",
    promptRequired: true
})
