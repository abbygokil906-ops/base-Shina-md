/*
  Gerbang "Group Only" & "Admin Only" (dipanggil dari fuyuha.js sebelum command mana pun dijalankan).

  .gruponly on/off   (owner)  -> chat pribadi (PC) dari non-owner yang kirim command: DIAM, tidak direspon sama sekali
  .gruponly2 on/off  (owner)  -> chat pribadi dari non-owner yang kirim command: dibalas pesan "khusus group only" lalu NOMORNYA DIBLOKIR
  .adminonly on/off  (admin grup / owner, per grup) -> di grup itu cuma admin (dan owner) yang direspon, member biasa diabaikan total

  Catatan:
  - Owner tidak pernah kena gerbang ini.
  - Yang kena cuma COMMAND (pesan berawalan prefix). Chat biasa tidak memicu apa-apa.
  - Saat Nokos Mode / Warung Mode ON, gerbang chat pribadi dilewati supaya jualan di PC tetap jalan.
  - Ganti kata-kata balasan di GROUPONLY2_TEXT.
*/
const GROUPONLY2_TEXT =
    "🚫 *Ini bot khusus GROUP ONLY, tolol!*\n\n" +
    "Gua nggak melayani chat pribadi. Pakai di grup, jangan spam di PC.\n" +
    "Karena lu udah ngelanggar, lu gua blokir. Bye 👋"

const blocking = new Set() // supaya yang spam beberapa command sekaligus cuma dibalas & diblokir sekali

const storeMode = () => {
    try { if (require("./Nokos.js").modeOn()) return true } catch (_) {}
    try { if (require("./Warung.js").modeOn()) return true } catch (_) {}
    return false
}

const settings = () => { if (typeof global.db.settings !== "object") global.db.settings = {}; return global.db.settings }
const gdata = (jid) => { if (typeof global.db.groups[jid] !== "object") global.db.groups[jid] = {}; return global.db.groups[jid] }

/**
 * return true  -> pesan ini diblokir gerbang (JANGAN diproses lagi)
 * return false -> lanjut normal
 */
async function check({ sock, m, isCmd, isOwner }) {
    if (!isCmd || isOwner) return false

    if (m.isGroup) {
        const g = global.db.groups && global.db.groups[m.chat]
        if (g && g.adminOnly && !m.isAdmin) return true // member biasa: diabaikan total
        return false
    }

    // chat pribadi
    const st = settings()
    if (!st.grupOnly && !st.grupOnly2) return false
    if (storeMode()) return false

    if (st.grupOnly2) {
        if (blocking.has(m.chat)) return true
        blocking.add(m.chat)
        try {
            await sock.sendMessage(m.chat, { text: GROUPONLY2_TEXT }, { quoted: m })
        } catch (_) {}
        try {
            await new Promise((r) => setTimeout(r, 1200))
            await sock.updateBlockStatus(m.chat, "block")
            console.log("[GroupOnly] diblokir:", m.chat)
        } catch (e) {
            console.log("[GroupOnly] gagal blokir", m.chat, e?.message || e)
        }
        setTimeout(() => blocking.delete(m.chat), 60000)
        return true
    }
    return true // gruponly: diam saja
}

module.exports = { check, settings, gdata, GROUPONLY2_TEXT }
