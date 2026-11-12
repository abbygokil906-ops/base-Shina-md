const { tool } = require("./_lib.js")

module.exports = tool({
    name: "unblur",
    command: ["unblur"],
    endpoint: "unblur",
    desc: "Jernihkan foto buram. Model: unblur-v2, photo-enhancer, photo-restoration, text-enhancer, blur-remover",
    usage: "[model]  (kirim/reply foto)",
    example: "photo-enhancer",
    mode: "photo",
    options: [{ names: ["model"], match: ["unblur-v2", "photo-enhancer", "photo-restoration", "text-enhancer", "blur-remover"] }]
})
