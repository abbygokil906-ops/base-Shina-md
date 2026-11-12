const { Usage, needAdmin, gdata, onOff } = require("./_lib.js")
const { DEFAULT_WELCOME } = require("../../source/GroupGuard.js")

const HELP = `*Penanda yang bisa dipakai di teks welcome:*
• @user → tag member baru
• @group → nama grup
• @desc → deskripsi grup
• @member → jumlah member`

module.exports = {
    name: "welcome",
    command: ["welcome", "setwelcome", "resetwelcome"],
    desc: "Welcome grup + ganti teks welcome",
    usage: "on/off  |  setwelcome <teks>",
    example: "setwelcome Halo @user, selamat datang di @group!",
    async run({ m, command, args, text, prefix, isOwner }) {
        needAdmin(m, isOwner)
        const g = gdata(m.chat)

        if (command === "welcome") {
            const val = onOff(args[0] || "")
            if (val === null) throw new Usage(`*Welcome* : ${g.welcome ? "✅ Aktif" : "❌ Mati"}\n\nPakai: ${prefix}welcome on/off\nGanti teks: ${prefix}setwelcome <teks>`)
            g.welcome = val
            return m.reply(`✅ Welcome ${val ? "dinyalakan" : "dimatikan"} di grup ini.`)
        }

        if (command === "resetwelcome") {
            delete g.welcomeText
            return m.reply("✅ Teks welcome dikembalikan ke bawaan.")
        }

        // setwelcome: teks bisa dari argumen atau reply teks
        const teks = (text || m.quoted?.text || "").trim()
        if (!teks) throw new Usage(`*Teks welcome sekarang:*\n${g.welcomeText || DEFAULT_WELCOME}\n\n*Cara ganti:*\n${prefix}setwelcome <teks>\n\n${HELP}`)
        if (teks.length > 800) throw new Usage("Teks welcome kepanjangan (maks 800 huruf).")
        g.welcomeText = teks
        await m.reply(`✅ Teks welcome diganti.${g.welcome ? "" : `\n\n⚠️ Welcome masih mati, nyalakan dengan ${prefix}welcome on`}\n\n*Hasilnya:*\n${teks}`)
    }
}
