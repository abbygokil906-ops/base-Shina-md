const { Usage, needAdmin, needBotAdmin, mediaOf } = require("./_lib.js")

const CH_LINK = /whatsapp\.com\/channel\/([A-Za-z0-9]+)/i

module.exports = {
    name: "setpp",
    command: ["setppgc", "setppbot", "setppch"],
    desc: "Ganti foto profil grup / bot / saluran (kirim atau reply foto)",
    usage: "(kirim/reply foto)  — setppch: tambah link/id saluran",
    example: "https://whatsapp.com/channel/xxxx",
    async run({ sock, m, command, text, prefix, isOwner }) {
        const media = await mediaOf(m, /image/)
        if (!media) throw new Usage(`Kirim atau reply *foto* dengan caption ${prefix}${command}${command === "setppch" ? " <link/id saluran>" : ""}`)

        if (command === "setppgc") {
            needAdmin(m, isOwner); needBotAdmin(m)
            await sock.updateProfilePicture(m.chat, media.buffer)
            return m.reply("✅ Foto profil grup diganti.")
        }

        if (!isOwner) throw new Usage(global.mess?.owner || "Fitur ini hanya untuk ownerbot.")

        if (command === "setppbot") {
            await sock.updateProfilePicture(sock.user.id, media.buffer)
            return m.reply("✅ Foto profil bot diganti.")
        }

        // setppch: butuh id saluran (xxx@newsletter) atau link saluran
        let id = (text.match(/\S+@newsletter/) || [])[0]
        if (!id) {
            const code = (text.match(CH_LINK) || [])[1]
            if (!code) throw new Usage(`Tambahkan link atau id saluran.\nContoh: ${prefix}setppch https://whatsapp.com/channel/xxxx`)
            const meta = await sock.newsletterMetadata("invite", code)
            id = meta?.id
            if (!id) throw new Error("Saluran tidak ditemukan")
        }
        await sock.newsletterUpdatePicture(id, media.buffer)
        await m.reply("✅ Foto profil saluran diganti (kamu harus admin/owner saluran itu).")
    }
}
