const { tool } = require("./_lib.js")

module.exports = tool({
    name: "tiktokcheck",
    command: ["tiktokcheck", "cektiktok"],
    endpoint: "tiktok-checker",
    desc: "Cek akun TikTok",
    usage: "<username>",
    example: "fuyuha",
    needs: "text",
    params: ({ text }) => ({ username: text.replace(/^@/, "") })
})
