const { needAdmin, gdata, settings } = require("./_lib.js")

const ROWS = [
    ["antilink", "Anti Link Grup"], ["antilink2", "Anti Link Grup 2"], ["antilinkch", "Anti Link Saluran"], ["antitagch", "Anti Tag Saluran"],
    ["antitagsw", "Anti Tag SW"], ["antisw", "Anti SW Grup"], ["antitoxic", "Anti Toxic"], ["antibokep", "Anti Bokep"], ["antidel", "Anti Delete"], ["welcome", "Welcome"], ["adminOnly", "Admin Only"]
]
const mark = (v) => (v ? "✅" : "❌")

module.exports = {
    name: "statusgrup",
    command: ["statusgrup", "infogrup"],
    desc: "Lihat status semua fitur di grup ini",
    async run({ m, isOwner }) {
        needAdmin(m, isOwner)
        const g = gdata(m.chat)
        let out = `┏━━━━━━━━━━━━━━━━━━━━\n${ROWS.map(([k, label]) => `│ ${label.padEnd(18)}: ${mark(g[k])}`).join("\n")}\n┗━━━━━━━━━━━━━━━━━━━━`
        if (isOwner) {
            const st = settings()
            out += `\n\n*Pengaturan owner (semua chat)*\n│ Auto Lihat Chat   : ${mark(st.autoread)}\n│ Auto Ngetik       : ${mark(st.autotyping)}\n│ Auto Lihat SW 🩷  : ${mark(st.autoreadsw)}\n│ Group Only (PC)   : ${mark(st.grupOnly)}\n│ Group Only 2      : ${mark(st.grupOnly2)}`
        }
        await m.reply(`${out}\n\n_✅ = Aktif   ❌ = Tidak Aktif_`)
    }
}
