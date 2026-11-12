/*
  Afk.js — fitur AFK per grup (kategori Grup)
    .afk <alasan>   tandai diri AFK di grup ini (alasan boleh kosong)
  Saat AFK:
    • Ada yang tag / reply dia -> pesan itu langsung DIHAPUS (kalau bot admin) + bot kasih tahu "lagi AFK, jangan diganggu"
    • Dia chat lagi di grup itu -> AFK otomatis selesai + bot sambut balik beserta lamanya AFK
  Data: global.db.groups[grup].afk[...]
*/
const digits = (x) => String(x || "").split(":")[0].split("@")[0]
const idsOfMsg = (m) => [m.sender, m.key?.participantPn, m.key?.participantAlt, m.key?.senderPn].filter(Boolean).map(digits)
const store = (jid) => {
    const g = (global.db.groups[jid] = typeof global.db.groups[jid] === "object" ? global.db.groups[jid] : {})
    if (!g.afk || typeof g.afk !== "object") g.afk = {}
    return g.afk
}

function dur(ms) {
    const s = Math.max(1, Math.floor(ms / 1000))
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), mnt = Math.floor((s % 3600) / 60), dt = s % 60
    const p = []
    if (d) p.push(`${d} hari`)
    if (h) p.push(`${h} jam`)
    if (mnt) p.push(`${mnt} menit`)
    if (!p.length) p.push(`${dt} detik`)
    return p.slice(0, 2).join(" ")
}

function findAfk(afk, id) {
    const d = digits(id)
    for (const [k, v] of Object.entries(afk)) if (digits(k) === d || (v.ids || []).includes(d)) return [k, v]
    return null
}

function setAfk(m, reason) {
    const afk = store(m.chat)
    afk[m.sender] = { since: Date.now(), reason: reason || "", ids: idsOfMsg(m) }
}

const cooldown = new Map()

// dipanggil dari fuyuha.js untuk setiap pesan grup. return true = pesan sudah ditangani (dihapus), hentikan proses lain
async function onMessage({ sock, m, isOwner, isCmd, command }) {
    if (!m.isGroup || !m.message || m.fromMe || m.message.protocolMessage) return false
    const afk = store(m.chat)
    if (!Object.keys(afk).length) return false
    const mentions = (m.mentionedJid || []).slice()
    if (m.quoted?.sender) mentions.push(m.quoted.sender)

    // 1) yang AFK chat lagi -> selesai AFK
    if (!(isCmd && command === "afk")) {
        const me = idsOfMsg(m).map((d) => findAfk(afk, d)).find(Boolean)
        if (me) {
            const [key, v] = me
            delete afk[key]
            const teks = `👋 *Hore, @${digits(m.sender)} sudah balik!*\n\n⏱️ AFK selama: ${dur(Date.now() - v.since)}${v.reason ? `\n📝 Alasan tadi: ${v.reason}` : ""}\n\nSelamat datang kembali 🎉`
            await sock.sendMessage(m.chat, { text: teks, mentions: [m.sender] }, { quoted: m }).catch(() => {})
        }
    }

    // 2) ada yang ganggu orang AFK
    if (!mentions.length || mentions.length > 5) return false   // tag massal (tagall/hidetag) dilewati
    const senderIds = idsOfMsg(m)
    const hit = []
    for (const j of new Set(mentions)) {
        if (senderIds.includes(digits(j))) continue
        const f = findAfk(afk, j)
        if (f) hit.push({ jid: j, key: f[0], v: f[1] })
    }
    if (!hit.length) return false
    const lines = hit.map((h) => `😴 @${digits(h.key)} lagi *AFK* — jangan diganggu!\n⏱️ Sudah ${dur(Date.now() - h.v.since)}${h.v.reason ? `\n📝 Alasan: ${h.v.reason}` : "\n📝 Tanpa alasan"}`).join("\n\n")
    let deleted = false
    if (m.isBotAdmin && !isOwner) { await sock.sendMessage(m.chat, { delete: m.key }).then(() => { deleted = true }).catch(() => {}) }
    const ck = `${m.chat}|${digits(m.sender)}`
    if (Date.now() - (cooldown.get(ck) || 0) < 15000) return deleted   // jangan spam balasan
    cooldown.set(ck, Date.now())
    await sock.sendMessage(m.chat, {
        text: `${lines}\n\n_Chat dari @${digits(m.sender)} ${deleted ? "dihapus" : "tidak dihapus (bot bukan admin)"}, tunggu dia balik ya._`,
        mentions: [...hit.map((h) => h.key), m.sender]
    }, { quoted: null }).catch(() => {})
    return deleted
}

module.exports = { onMessage, setAfk, store, findAfk, dur, digits }
