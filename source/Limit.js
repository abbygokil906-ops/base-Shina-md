/*
  Sistem limit Fuyuha Shina MD
  - Warlock (user biasa) : limit harian 15 untuk fitur berlimit (play, tiktok, sticker, tourl, dst)
  - Premium              : unlimited
  - Owner                : unlimited
  Limit Warlock di-reset otomatis tiap ganti hari (WIB).

  Limit tambahan bisa DIBELI pakai koin hasil main RPG (.belilimit). Limit hasil beli tidak hangus saat
  reset harian: kalau sisa limit > 15 maka sisanya dibawa ke hari berikutnya, kalau kurang dari 15 diisi ulang jadi 15.
  Setiap fitur berlimit selesai dijalankan, bot membalas notifikasi sisa limit (lihat notify()).
*/
const DAILY_LIMIT = 15
const MAX_LIMIT = 100      // batas simpanan limit (hasil beli)
const LIMIT_PRICE = 5000   // harga 1 limit (koin RPG)

// fitur yang makan limit (nama command, termasuk alias)
const LIMITED = new Set([
    "tourl", "tourl2",
    "sticker", "stiker", "sgif", "s",
    "play", "play2", "playmusic", "playlirik",
    "tiktok", "tt", "ttsearch",
    // download API (plugins/download/api)
    "aio", "alldl", "aio2", "alldl2", "amdl", "alightmotion", "bilibili", "bstation", "capcut", "capcutdl", "facebook", "fb", "fbdl", "gdrive", "gdl", "igmp3", "igaudio", "instagram", "ig", "igdl", "mediafire", "mf", "pindl", "pindownload", "playspotify", "splay", "shopee", "shopeevideo", "snackvideo", "snack", "spotifydl", "spdl", "terabox", "tb", "tiktok2", "tt2", "ttnowm", "ttdl", "tiktokdl", "twitter", "twitterdl", "twdl", "xdl", "ucdl", "ucdrive", "wattpad", "wpdl", "youtubedl", "ytdl", "ytmp3", "yta", "ytmp4", "ytv", "ytplay", "play3"
])

const clean = (j = "") => String(j).split(":")[0].split("@")[0]
const today = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10) // tanggal WIB

function getUser(jid) {
    if (typeof global.db.users[jid] !== "object") global.db.users[jid] = {}
    const u = global.db.users[jid]
    if (typeof u.limit !== "number") u.limit = DAILY_LIMIT
    if (typeof u.premium !== "boolean") u.premium = false
    if (typeof u.premiumUntil !== "number") u.premiumUntil = 0 // 0 = permanen
    if (u.lastReset !== today()) {
        u.limit = Math.max(DAILY_LIMIT, u.limit) // limit hasil beli ikut terbawa
        u.lastReset = today()
    }
    return u
}

// semua kemungkinan id si pengirim (jid biasa / lid / nomor asli)
function candidates(m) {
    const key = m.key || {}
    const list = [m.sender, key.senderPn, key.participantPn, key.participantAlt, key.remoteJidAlt]
        .filter(Boolean)
        .map((j) => (String(j).includes("@") ? String(j).split(":")[0].replace(/:\d+/, "") : clean(j) + "@s.whatsapp.net"))
    return [...new Set(list.map((j) => (j.includes("@") ? clean(j) + "@" + j.split("@")[1] : j)))]
}

function premiumActive(u) {
    if (!u || !u.premium) return false
    if (u.premiumUntil && u.premiumUntil < Date.now()) {
        u.premium = false
        u.premiumUntil = 0
        return false
    }
    return true
}

function isPremium(m) {
    return candidates(m).some((j) => premiumActive(global.db.users[j]))
}

// { role, label, unlimited, limit, max }
function status(m, isOwner) {
    const u = getUser(m.sender)
    if (isOwner) return { role: "owner", label: "👑 Owner", unlimited: true, limit: "∞", max: "∞", user: u }
    if (isPremium(m)) return { role: "premium", label: "💎 Premium", unlimited: true, limit: "∞", max: "∞", user: u }
    return { role: "warlock", label: "🧙 Warlock", unlimited: false, limit: u.limit, max: DAILY_LIMIT, user: u }
}

function limitText(st) {
    if (st.unlimited) return "Unlimited ♾️"
    return st.limit > st.max ? `${st.limit} (${st.max} harian + ${st.limit - st.max} beli)` : `${st.limit}/${st.max}`
}

/**
 * Dipanggil sebelum command dijalankan.
 * return true  -> boleh jalan
 * return false -> limit habis (sudah membalas ke user)
 * `ready` = apakah command benar-benar akan dieksekusi (ada media/teks). Kalau belum
 * (user cuma lihat cara pakai) limit tidak dipotong.
 */
async function gate(m, command, isOwner, ready = true) {
    if (!LIMITED.has(command)) return true
    const st = status(m, isOwner)
    if (st.unlimited) return true
    if (st.user.limit <= 0) {
        await m.reply(
            `🚫 *Limit kamu habis!*\n\n` +
            `Status : ${st.label}\n` +
            `Limit  : 0/${DAILY_LIMIT}\n\n` +
            `⏳ Limit direset otomatis tiap hari (00.00 WIB).\n` +
            `⚔️ Mau nambah sekarang? Main RPG buat cari koin (*.rpg*), lalu beli limit: *.belilimit <jumlah>* (${LIMIT_PRICE.toLocaleString("id-ID")} koin / limit).\n` +
            `💎 Atau upgrade ke *Premium* lewat owner (.owner) biar unlimited.`
        )
        return false
    }
    if (ready) {
        st.user.limit -= 1
        m._limitUsed = { command, left: st.user.limit } // notifikasi dikirim setelah fitur selesai (lihat notify)
    }
    return true
}

/**
 * Teks notifikasi sisa limit, dikirim SETELAH fitur berlimit selesai jalan.
 * return null kalau tidak ada yang perlu diberitahu (fitur tidak makan limit / premium / owner).
 */
function notify(m) {
    const used = m && m._limitUsed
    if (!used) return null
    m._limitUsed = null
    const u = global.db.users[m.sender]
    if (!u) return null
    const left = u.limit
    const bonus = left > DAILY_LIMIT ? ` (${DAILY_LIMIT} harian + ${left - DAILY_LIMIT} beli)` : ""
    return (
        `📊 *Limit kamu tinggal ${left}${left > DAILY_LIMIT ? "" : "/" + DAILY_LIMIT}*${bonus}\n` +
        `Fitur *.${used.command}* memakai 1 limit.\n\n` +
        (left <= 0
            ? `🚫 Limit habis! Main RPG buat cari koin, lalu beli limit pakai *.belilimit <jumlah>*.`
            : `💡 Limit mau habis? Cari koin lewat RPG (*.rpg*), lalu beli limit: *.belilimit <jumlah>* (${LIMIT_PRICE.toLocaleString("id-ID")} koin / limit).`)
    )
}

// tambah limit (hasil beli). return jumlah yang benar-benar ditambahkan (dibatasi MAX_LIMIT)
function addLimit(jid, n) {
    const u = getUser(jid)
    const can = Math.max(0, Math.min(n, MAX_LIMIT - u.limit))
    u.limit += can
    return can
}

function addPremium(jid, days = 0) {
    if (typeof global.db.users[jid] !== "object") global.db.users[jid] = {}
    const u = getUser(jid)
    u.premium = true
    u.premiumUntil = days > 0 ? Math.max(Date.now(), u.premiumUntil || 0) + days * 86400000 : 0
    return u
}

function delPremium(jid) {
    const u = global.db.users[jid]
    if (!u || !u.premium) return false
    u.premium = false
    u.premiumUntil = 0
    return true
}

function listPremium() {
    return Object.entries(global.db.users || {})
        .filter(([, u]) => premiumActive(u))
        .map(([jid, u]) => ({ jid, until: u.premiumUntil }))
}

module.exports = { DAILY_LIMIT, MAX_LIMIT, LIMIT_PRICE, LIMITED, notify, addLimit, isPremium, status, limitText, gate, addPremium, delPremium, listPremium, getUser }
