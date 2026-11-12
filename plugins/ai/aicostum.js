const { tool } = require("./_lib.js")

module.exports = tool({
    name: "aicostum",
    command: ["aicostum", "aicustom"],
    endpoint: "aicostum",
    desc: "Chat dengan AI karakter buatan sendiri: atur kepribadiannya lewat prompt",
    usage: "<kepribadian AI>|<pertanyaan>",
    example: "kamu bajak laut galak|halo siapa kamu?",
    needs: "text",
    prompt: true
})
