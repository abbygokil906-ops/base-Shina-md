const { needGroup } = require("./_lib.js")
const Afk = require("../../source/Afk.js")

module.exports = {
    name: "afk",
    command: ["afk"],
    desc: "Tandai AFK di grup (tag ke kamu dihapus, bot kasih tahu)",
    usage: "<alasan>",
    example: "afk makan dulu",
    async run({ sock, m, text }) {
        needGroup(m)
        const reason = String(text || "").trim().slice(0, 150)
        Afk.setAfk(m, reason)
        await sock.sendMessage(m.chat, {
            text: `@${Afk.digits(m.sender)} sekarang *AFK* di grup ini.\n📝 Alasan: ${reason || "tanpa alasan"}\n\nKalau ada yang tag kamu, chat-nya dihapus & bot bilang kamu lagi AFK. Chat lagi di grup ini untuk berhenti AFK.`,
            mentions: [m.sender]
        }, { quoted: m })
    }
}
