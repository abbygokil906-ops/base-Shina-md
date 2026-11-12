/* Helper fitur Grup (diawali "_" jadi tidak dimuat sebagai fitur). */
const { Usage } = require("../../source/PluginLoader.js")

const mess = () => global.mess || {}
const num = (j = "") => String(j).split("@")[0].split(":")[0]

// guard: lempar Usage(pesan) -> loader membalas pesannya
const needGroup = (m) => { if (!m.isGroup) throw new Usage(mess().group) }
const needAdmin = (m, isOwner) => { needGroup(m); if (!isOwner && !m.isAdmin) throw new Usage(mess().admin) }
const needBotAdmin = (m) => { if (!m.isBotAdmin) throw new Usage(mess().botadmin) }

// data grup (dibuat kalau belum ada)
const gdata = (jid) => { if (typeof global.db.groups[jid] !== "object") global.db.groups[jid] = {}; return global.db.groups[jid] }
const settings = () => { if (typeof global.db.settings !== "object") global.db.settings = {}; return global.db.settings }

// target dari @tag / reply / nomor
function targetOf(m, text = "") {
    if (m.mentionedJid?.[0]) return m.mentionedJid[0]
    if (m.quoted?.sender) return m.quoted.sender
    const d = String(text).replace(/[^0-9]/g, "")
    return d.length >= 8 ? d + "@s.whatsapp.net" : null
}

// media dari pesan ini / reply: { buffer, mime } atau null
async function mediaOf(m, kind = /image|video|audio/) {
    const q = m.quoted || m
    const mime = q?.msg?.mimetype || q?.mimetype || ""
    if (!kind.test(mime) || typeof q.download !== "function") return null
    return { buffer: await q.download(), mime }
}

const onOff = (s = "") => (/^(on|aktif|nyala|1|true)$/i.test(s.trim()) ? true : /^(off|mati|nonaktif|0|false)$/i.test(s.trim()) ? false : null)

module.exports = { Usage, num, needGroup, needAdmin, needBotAdmin, gdata, settings, targetOf, mediaOf, onOff }
