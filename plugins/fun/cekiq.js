/**
 * Fuyuha Shina MD — WhatsApp Bot
 * Plugin  : Fun — Cek IQ (acak tapi konsisten per nomor)
 * Type    : Plugins | ESM Modules
 * Asal    : Ryusei Hoshino (MIT), disesuaikan ke struktur Fuyuha Shina MD
 *
 * Contoh:  .cekiq   |   .cekiq @tag   |   .cekiq (reply pesan)   |   .cekiq 628123456789
 */

function hashString(str) {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

const getIQ = (number) => 40 + (hashString(String(number || '0')) % 141) // 40 - 180

function getTitle(iq) {
    if (iq < 50) return 'Dongo bet anj'
    if (iq < 70) return 'SDM rendah😹'
    if (iq < 85) return 'SDM rendah😹'
    if (iq < 100) return 'mayan'
    if (iq < 115) return 'SDM tinggi=Arshi'
    if (iq < 130) return 'SDM tinggi=Arshi'
    if (iq < 145) return 'SDM tinggi=Arshi'
    return 'Jenius Luar Biasa'
}

function resolveTarget(m, text) {
    if (m.mentionedJid?.length) {
        const jid = m.mentionedJid[0]
        const num = String(jid).split('@')[0].replace(/\D/g, '')
        return { number: num, name: `@${num}`, mentions: [jid] }
    }
    if (m.quoted?.sender) {
        const jid = m.quoted.sender
        const num = String(jid).split('@')[0].replace(/\D/g, '')
        return { number: num, name: `@${num}`, mentions: [jid] }
    }
    const cleaned = String(text || '').replace(/\D/g, '')
    if (cleaned) return { number: cleaned, name: cleaned, mentions: [] }
    const self = String(m.sender || '').split('@')[0].replace(/\D/g, '')
    return { number: self, name: 'Kamu', mentions: [m.sender] }
}

let handler = async (m, { sock, text, reply }) => {
    const t = resolveTarget(m, text)
    if (!t.number) return reply('Target tidak valid.')

    const iq = getIQ(t.number)
    const out =
        `*CEK IQ*\n\n` +
        `Target : ${t.name}\n` +
        `Nomor  : ${t.number}\n` +
        `IQ     : *${iq}*\n` +
        `Title  : ${getTitle(iq)}`

    return sock.sendMessage(m.chat, { text: out, mentions: t.mentions }, { quoted: m })
}

handler.command = ['cekiq']
handler.help = ['cekiq [@tag/nomor]']
handler.tags = ['fun']

export default handler
