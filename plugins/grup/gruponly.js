const { Usage, needAdmin, gdata, settings, onOff } = require("./_lib.js")

const mark = (v) => (v ? "✅ Aktif" : "❌ Mati")

module.exports = {
    name: "gruponly",
    command: ["gruponly", "gruponly2", "adminonly"],
    desc: "Group only (PC diabaikan) / Group only 2 (PC dibalas + diblokir) / Admin only (cuma admin yang direspon)",
    usage: "on/off",
    example: "on",
    async run({ m, command, args, prefix, isOwner }) {
        const val = onOff(args[0] || "")

        if (command === "adminonly") {
            needAdmin(m, isOwner)                     // harus di grup, oleh admin / owner
            const g = gdata(m.chat)
            if (val === null) throw new Usage(`*Admin Only* grup ini : ${mark(g.adminOnly)}\n\nPakai: ${prefix}adminonly on/off\nOn = cuma admin grup yang direspon bot, member biasa diabaikan total.`)
            g.adminOnly = val
            return m.reply(val
                ? "✅ *Admin Only* dinyalakan.\nSekarang bot cuma merespon *admin grup*. Member biasa diabaikan total."
                : "✅ *Admin Only* dimatikan.\nSemua member bisa pakai bot lagi.")
        }

        // gruponly / gruponly2 = pengaturan global, owner saja
        if (!isOwner) throw new Usage(global.mess?.owner || "Fitur ini hanya untuk ownerbot.")
        const st = settings()
        const key = command === "gruponly2" ? "grupOnly2" : "grupOnly"
        const label = command === "gruponly2" ? "Group Only 2" : "Group Only"
        if (val === null) {
            throw new Usage(
                `*${label}* : ${mark(st[key])}\n\nPakai: ${prefix}${command} on/off\n` +
                (command === "gruponly2"
                    ? "On = yang chat pribadi pakai command dibalas \"khusus group only\" lalu *nomornya diblokir*."
                    : "On = chat pribadi (PC) dari non-owner diabaikan, tidak ada respon sama sekali.")
            )
        }
        st[key] = val
        let note = ""
        if (val && command === "gruponly2") note = "\n⚠️ Setiap non-owner yang pakai command di PC akan *dibalas lalu diblokir*."
        if (val && command === "gruponly") note = "\nChat pribadi dari non-owner sekarang tidak direspon."
        if (val && st.grupOnly && st.grupOnly2) note += "\nℹ️ Dua-duanya aktif: yang dipakai *Group Only 2* (balas + blokir)."
        note += "\nℹ️ Saat Nokos/Warung Mode ON, gerbang PC dilewati supaya jualan di PC tetap jalan."
        await m.reply(`✅ *${label}* ${val ? "dinyalakan" : "dimatikan"}.${note}`)
    }
}
