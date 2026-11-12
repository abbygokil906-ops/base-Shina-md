const { Usage, num, targetOf } = require("./_lib.js")

module.exports = {
    name: "getpp",
    command: ["getpp", "getppgc"],
    desc: "Ambil foto profil (orang / grup)",
    usage: "[@tag / reply / nomor]  (kosong = foto profil kamu)",
    example: "@tag",
    async run({ sock, m, command, text }) {
        let jid, label
        if (command === "getppgc") {
            if (!m.isGroup) throw new Usage(global.mess?.group)
            jid = m.chat; label = "grup ini"
        } else {
            jid = targetOf(m, text) || m.sender
            label = `@${num(jid)}`
        }
        let url
        try { url = await sock.profilePictureUrl(jid, "image") } catch (e) { url = null }
        if (!url) return m.reply(`❌ Foto profil ${label} tidak ada / disembunyikan.`)
        await sock.sendMessage(m.chat, { image: { url }, caption: `🖼️ Foto profil ${label}`, mentions: command === "getpp" ? [jid] : [] }, { quoted: m })
    }
}
