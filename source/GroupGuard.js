/*
  GroupGuard — fitur grup yang jalan OTOMATIS (tanpa command), dipanggil dari fuyuha.js & main.js.

  onMessage     : anti link saluran, anti tag saluran, anti tag SW, anti SW grup, anti toxic, anti bokep, anti del
  onParticipants: notif promote / demote (selalu aktif) + welcome kustom (per grup, .welcome on + .setwelcome)
  onStatus      : auto lihat SW + react 🩷 (satu fitur, .autoreadsw on/off, owner)
  onIncoming    : auto lihat chat (.autoread) & auto ngetik (.autotyping)

  Toggle per grup disimpan di global.db.groups[jid], toggle owner di global.db.settings.
  Antilink grup (chat.whatsapp.com) tetap pakai .antilink / .antilink2 yang sudah ada di fuyuha.js.
*/
const { proto } = require("baileys")
const Toxic = require("../plugins/grup/_toxic.js")

const MAX_WARN = 3                 // anti toxic: sekian kali kena -> dikeluarkan
const CACHE_MAX = 3000             // jumlah pesan yang diingat untuk anti del
const cache = new Map()            // idPesan -> { msg, sender }
const nsfwSeen = new Map()         // sha256 media -> true/false (biar gambar sama tidak dicek ulang)

const num = (j = "") => String(j).split("@")[0].split(":")[0]
const jidOf = (p) => (typeof p === "string" ? p : p?.phoneNumber || p?.id || p?.jid || "")
const group = (jid) => (global.db?.groups?.[jid] || {})

// cari nama field di dalam isi pesan (dangkal, aman untuk Buffer)
function hasKey(obj, names, depth = 0) {
    if (!obj || typeof obj !== "object" || depth > 4 || obj instanceof Uint8Array) return false
    for (const k of Object.keys(obj)) {
        if (names.includes(k)) return true
        if (hasKey(obj[k], names, depth + 1)) return true
    }
    return false
}

const RE_CH_LINK = /whatsapp\.com\/channel\/[A-Za-z0-9]+/i
const RE_PORN = /(xnxx|xvideos|pornhub|xhamster|redtube|youporn|spankbang|bokepindo|bokep\d*\.|hentaihaven|nhentai\.net|rule34|onlyfans\.com)|\b(bokep|video bokep|link bokep|jual bokep)\b/i

// ---- cek gambar/stiker bokep lewat API cek-nsfw (sama dengan .ceknsfw), hasil dibaca longgar ----
function nsfwVerdict(json) {
    let hit = false
    const walk = (v, key = "", d = 0) => {
        if (hit || d > 4 || v === null || v === undefined) return
        if (typeof v === "object") { for (const [k, x] of Object.entries(v)) walk(x, k, d + 1); return }
        if (/safe|sfw|neutral/i.test(key) && !/nsfw/i.test(key)) return
        if (/nsfw|porn|explicit|adult|unsafe|hentai|sexy/i.test(key)) {
            if (v === true) hit = true
            else if (typeof v === "number") hit = v > 1 ? v >= 70 : v >= 0.7
            else if (typeof v === "string") hit = /^(true|yes|nsfw|porn|explicit|unsafe|hentai)$/i.test(v.trim())
        } else if (/^(label|class|category|result|prediction)$/i.test(key) && typeof v === "string") {
            hit = /^(nsfw|porn|hentai|explicit|unsafe)$/i.test(v.trim())
        }
    }
    walk(json)
    return hit
}

async function isNsfwMedia(m) {
    const mime = m.msg?.mimetype || ""
    if (!/^image\//.test(mime) || typeof m.download !== "function") return false
    if (Number(m.msg?.fileLength || 0) > 6 * 1024 * 1024) return false
    const sha = Buffer.from(m.msg?.fileSha256 || []).toString("hex")
    if (sha && nsfwSeen.has(sha)) return nsfwSeen.get(sha)
    const Kit = require("./ApiKit.js")
    const Api = require("./ApiTool.js")
    const buf = await m.download()
    const link = await Kit.uploadMedia(buf)
    const res = await Api.call("cek-nsfw", { image: link }, 45000)
    const verdict = res.json ? nsfwVerdict(res.json) : false
    if (sha) { nsfwSeen.set(sha, verdict); if (nsfwSeen.size > 500) nsfwSeen.delete(nsfwSeen.keys().next().value) }
    return verdict
}

const del = (sock, m) => sock.sendMessage(m.chat, { delete: m.key }).catch(() => {})
const notice = (sock, m, text) => sock.sendMessage(m.chat, { text, mentions: [m.sender] }, { quoted: null }).catch(() => {})

async function onMessage({ sock, m, isOwner }) {
    if (!m.isGroup || !m.message) return false
    const g = group(m.chat)
    const pm = m.message.protocolMessage

    // ===== ANTI DEL: pesan yang dihapus pengirimnya dikirim ulang =====
    if (g.antidel) {
        const isRevoke = pm && (pm.type === 0 || pm.type === "REVOKE" || pm.type === proto.Message.ProtocolMessage.Type.REVOKE)
        if (isRevoke && pm.key?.id) {
            const saved = cache.get(pm.key.id)
            // yang dihapus admin lain (bukan si pengirim) dibiarkan, itu moderasi
            if (saved && saved.sender === m.sender && !isOwner && !m.fromMe) {
                try {
                    await sock.sendMessage(m.chat, { text: `🛡️ *ANTI DELETE*\n@${num(m.sender)} menghapus pesan ini, tapi gak bisa kabur 😏`, mentions: [m.sender] }, { quoted: null })
                    await sock.sendMessage(m.chat, { forward: saved.msg }, { quoted: null })
                } catch (e) { console.log("[AntiDel] gagal kirim ulang:", e.message) }
            }
            return false
        }
        if (!pm && !m.fromMe) {
            cache.set(m.key.id, { msg: { key: m.key, message: m.message }, sender: m.sender })
            if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value)
        }
    }

    // anti lain: yang kena cuma member biasa, dan bot harus admin supaya bisa menghapus
    if (m.fromMe || isOwner || m.isAdmin || !m.isBotAdmin) return false
    if (pm) return false

    const text = m.text || ""

    // ===== ANTI SW GRUP (status yang diposting ke grup) =====
    if (g.antisw && hasKey(m.message, ["groupStatusMessageV2", "groupStatusMessage"])) {
        await del(sock, m)
        await notice(sock, m, `🚫 *ANTI SW GRUP*\n@${num(m.sender)} dilarang bikin status di grup ini.`)
        return true
    }

    // ===== ANTI TAG SW (status yang nge-tag grup) =====
    if (g.antitagsw && hasKey(m.message, ["groupStatusMentionMessage", "statusMentionMessage", "groupMentionedMessage"])) {
        await del(sock, m)
        await notice(sock, m, `🚫 *ANTI TAG SW*\n@${num(m.sender)} dilarang nge-tag grup ke status.`)
        return true
    }

    // ===== ANTI LINK SALURAN =====
    if (g.antilinkch && RE_CH_LINK.test(text)) {
        await del(sock, m)
        await notice(sock, m, `🚫 *ANTI LINK SALURAN*\n@${num(m.sender)} dilarang kirim link saluran di sini.`)
        return true
    }

    // ===== ANTI TAG SALURAN (kiriman/undangan saluran) =====
    if (g.antitagch && hasKey(m.message, ["newsletterAdminInviteMessage", "forwardedNewsletterMessageInfo"])) {
        await del(sock, m)
        await notice(sock, m, `🚫 *ANTI TAG SALURAN*\n@${num(m.sender)} dilarang nyebar saluran di grup ini.`)
        return true
    }

    // ===== ANTI TOXIC =====
    if (g.antitoxic && text) {
        const bad = Toxic.findToxic(text)
        if (bad) {
            await del(sock, m)
            g.warns = g.warns || {}
            g.warns[m.sender] = (g.warns[m.sender] || 0) + 1
            const n = g.warns[m.sender]
            if (n >= MAX_WARN) {
                delete g.warns[m.sender]
                await notice(sock, m, `🤬 *ANTI TOXIC*\n@${num(m.sender)} udah ${MAX_WARN}x toxic. Dikeluarkan!`)
                await sock.groupParticipantsUpdate(m.chat, [m.sender], "remove").catch(() => {})
            } else {
                await notice(sock, m, `⚠️ *ANTI TOXIC*\n@${num(m.sender)} jaga omongan! Peringatan ${n}/${MAX_WARN}`)
            }
            return true
        }
    }

    // ===== ANTI BOKEP (link/kata + gambar/stiker) =====
    if (g.antibokep) {
        let porn = !!text && RE_PORN.test(text)
        if (!porn && /^(imageMessage|stickerMessage)$/.test(m.mtype || "")) {
            try { porn = await isNsfwMedia(m) } catch (e) { console.log("[AntiBokep] cek gambar gagal (dilewati):", e.message) }
        }
        if (porn) {
            await del(sock, m)
            await notice(sock, m, `🔞 *ANTI BOKEP*\n@${num(m.sender)} konten dewasa dilarang di grup ini.`)
            return true
        }
    }

    return false
}

// ===== promote / demote / welcome =====
const DEMOTE = [
    (p, a) => `😂 Mampus lu @${p}! Dijadikan member biasa sama @${a}.`,
    (p, a) => `🗿 Turun pangkat dikit, mampus. @${p} sekarang cuma member biasa (kata @${a}).`,
    (p, a) => `🤡 @${p} diturunin jadi member biasa sama @${a}. Dikit mampus dikit tolol.`,
    (p, a) => `💀 Pangkat @${p} dicabut sama @${a}. Selamat balik jadi rakyat jelata!`
]
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const DEFAULT_WELCOME = "👋 Halo @user!\nSelamat datang di *@group*.\nJangan lupa baca deskripsi & patuhi aturan ya.\n\n👥 Member sekarang: @member"

function fillWelcome(tpl, { user, subject, desc, count }) {
    return String(tpl)
        .replace(/@user/gi, `@${user}`)
        .replace(/@group|@subject/gi, subject)
        .replace(/@desc/gi, desc || "-")
        .replace(/@member|@count/gi, String(count))
}

async function onParticipants(sock, update) {
    const { id, action } = update
    let meta = null
    try {
        meta = await sock.groupMetadata(id)
        global.groupMetadataCache.set(id, meta)
    } catch (e) {}
    if (!["add", "promote", "demote"].includes(action)) return

    const users = (update.participants || []).map(jidOf).filter(Boolean)
    const author = jidOf(update.author)
    const g = group(id)

    for (const u of users) {
        try {
            if (action === "promote") {
                const text = author && author !== u
                    ? `🎉 *SELAMAT DATANG DI JAJARAN ADMIN*\n\n@${num(u)} dinaikkan pangkatnya jadi *admin* oleh @${num(author)}.\nJaga amanah & bantu rawat grup ya! 💪`
                    : `🎉 *SELAMAT DATANG DI JAJARAN ADMIN*\n\n@${num(u)} sekarang jadi *admin* grup. Jaga amanah ya! 💪`
                await sock.sendMessage(id, { text, mentions: [u, author].filter(Boolean) }, { quoted: null })
            } else if (action === "demote") {
                const text = author && author !== u ? pick(DEMOTE)(num(u), num(author)) : `😂 Mampus lu @${num(u)}, udah bukan admin lagi.`
                await sock.sendMessage(id, { text, mentions: [u, author].filter(Boolean) }, { quoted: null })
            } else if (action === "add") {
                // ditambahkan admin (author beda dari yang masuk) -> selalu disambut; masuk lewat link -> ikut aturan .welcome on
                const byAdmin = !!author && author !== u
                if (!byAdmin && !g.welcome) continue
                const base = g.welcome
                    ? fillWelcome(g.welcomeText || DEFAULT_WELCOME, { user: num(u), subject: meta?.subject || "grup ini", desc: meta?.desc, count: meta?.participants?.length || 0 })
                    : `👋 *SELAMAT DATANG* @${num(u)}!\nSelamat bergabung di *${meta?.subject || "grup ini"}*.\nJangan lupa baca deskripsi & patuhi aturan ya.\n\n👥 Member sekarang: ${meta?.participants?.length || 0}`
                const text = byAdmin ? `${base}\n\n➕ Ditambahkan oleh admin @${num(author)}` : base
                const mentions = [u, byAdmin ? author : null].filter(Boolean)
                let pp = null
                try { pp = await sock.profilePictureUrl(u, "image") } catch (e) {}
                if (pp) await sock.sendMessage(id, { image: { url: pp }, caption: text, mentions }, { quoted: null })
                else await sock.sendMessage(id, { text, mentions }, { quoted: null })
            }
        } catch (e) { console.log("[GroupGuard] notif peserta gagal:", e.message) }
    }
}

// ===== auto lihat SW + react 🩷 =====
async function onStatus(sock, msg) {
    if (!global.db?.settings?.autoreadsw) return
    if (msg.key.fromMe || !msg.message || msg.message.protocolMessage) return
    try {
        const bot = sock.decodeJid(sock.user.id)
        await sock.readMessages([msg.key])
        await sock.sendMessage("status@broadcast", { react: { text: "🩷", key: msg.key } }, { statusJidList: [msg.key.participant, bot].filter(Boolean) })
    } catch (e) { console.log("[AutoSW] gagal:", e.message) }
}

// ===== auto lihat chat & auto ngetik =====
function onIncoming(sock, m) {
    const st = global.db?.settings
    if (!st || m.fromMe) return
    if (st.autoread) sock.readMessages([m.key]).catch(() => {})
    if (st.autotyping && m.body) {
        sock.sendPresenceUpdate("composing", m.chat).catch(() => {})
        setTimeout(() => sock.sendPresenceUpdate("paused", m.chat).catch(() => {}), 3000)
    }
}

module.exports = { onMessage, onParticipants, onStatus, onIncoming, MAX_WARN, DEFAULT_WELCOME }
