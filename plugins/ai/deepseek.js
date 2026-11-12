const { tool } = require("./_lib.js")

module.exports = tool({
    name: "deepseek",
    command: ["deepseek", "ds"],
    endpoint: "deepseek",
    desc: "DeepSeek: pintar menalar, coding & matematika",
    usage: "<pertanyaan>",
    example: "buatkan fungsi javascript untuk cek bilangan prima",
    needs: "text"
})
