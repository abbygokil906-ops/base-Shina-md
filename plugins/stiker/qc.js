/*
  QC (Quote Chat) — satu file, banyak warna.
  .qc <warna> <teks>   atau pakai pintasan warna: .qcpink <teks>, .qcred <teks>, dst.
  Tanpa teks tapi reply pesan orang -> jadi quote chat orang itu.
  Daftar warna ada di COLORS (nama command -> nilai `color` yang dikirim ke API). Tambah/hapus warna di situ saja,
  menu kategori QC ikut otomatis.
*/
const { apiUrl, sendSticker } = require("./_lib.js")

const COLORS = {
    pink: "pink",
    blue: "blue",
    red: "red",
    green: "green",
    yellow: "yellow",
    purple: "purple",
    dark: "dark",
    white: "white",
    earth: "earth"
}
const DEFAULT = "green"

async function avatarOf(sock, jid, name) {
    try { const u = await sock.profilePictureUrl(jid, "image"); if (u) return u } catch (_) {}
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "?")}&size=256&background=random&format=png`
}

module.exports = {
    name: "qc",
    command: ["qc", ...Object.keys(COLORS).map((c) => "qc" + c)],
    desc: "Stiker quote chat (pilih warna)",
    usage: "<warna> <teks>",
    example: "pink halo semua",
    COLORS,
    async run({ sock, m, args, command, prefix }) {
        let color = COLORS[command.replace(/^qc/, "")]
        let rest = args.slice()
        if (!color && rest[0] && COLORS[rest[0].toLowerCase()]) color = COLORS[rest.shift().toLowerCase()]
        color = color || COLORS[DEFAULT]

        let text = rest.join(" ").trim()
        let jid = m.sender
        let name = m.pushName || m.sender.split("@")[0]
        if (!text && m.quoted?.text) {                     // reply pesan orang -> quote orang itu
            text = m.quoted.text
            jid = m.quoted.sender || jid
            name = m.quoted.pushName || (m.quoted.sender || "").split("@")[0] || name
        }
        if (!text) {
            return m.reply(`*Cara pakai:*\n${prefix}qc <warna> <teks>\nAtau: ${prefix}qcpink <teks>\nAtau reply pesan lalu ketik ${prefix}qc <warna>\n\n*Warna:* ${Object.keys(COLORS).join(", ")}\n\n*Contoh:*\n${prefix}qc pink halo semua`)
        }
        const avatar = await avatarOf(sock, jid, name)
        await sendSticker(sock, m, apiUrl("qc", { color, text, name, avatar }))
    }
}
