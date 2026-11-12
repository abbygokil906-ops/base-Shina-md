/*
  Adzan.js — pengingat adzan otomatis untuk SEMUA GRUP (kategori Grup)

    .adzan              lihat status grup ini + jadwal hari ini
    .adzan off | on     (admin grup / owner) matikan / nyalakan lagi adzan di grup ini
    .adzan test         (owner) kirim contoh sekarang
    .adzan kota <nama>  (owner) ganti kota jadwal (default Bandung)
    .adzan urutan audio|foto   (owner) mana yang dikirim duluan (default: audio dulu, lalu foto)

  DEFAULT NYALA di semua grup tempat bot berada (bot admin atau bukan). Grup yang dikunci (cuma admin yang boleh kirim)
  dan bot bukan admin otomatis dilewati karena pasti gagal kirim.
  Chat pribadi: tetap opt-in lewat .adzan on.

  Jadwal dari API aladhan (metode Kemenag RI) pakai koordinat kota, dicek tiap detik, kirim TEPAT saat masuk waktu.
  Foto : media/adzan-subuh.jpg, adzan-dzuhur.jpg, adzan-ashar.jpg, adzan-maghrib.jpg, adzan-isya.jpg
  Audio: media/adzan.mp3 (semua waktu) — opsional media/adzan-subuh.mp3 khusus Subuh.
*/
const fs = require("fs")
const path = require("path")

const MEDIA = path.join(__dirname, "..", "media")
const PRAYERS = [
    { key: "subuh",   nama: "Subuh",   api: "Fajr",    fallback: "04:10", ikon: "🌌" },
    { key: "dzuhur",  nama: "Dzuhur",  api: "Dhuhr",   fallback: "11:45", ikon: "☀️" },
    { key: "ashar",   nama: "Ashar",   api: "Asr",     fallback: "15:05", ikon: "🌤️" },
    { key: "maghrib", nama: "Maghrib", api: "Maghrib", fallback: "17:55", ikon: "🌇" },
    { key: "isya",    nama: "Isya",    api: "Isha",    fallback: "19:05", ikon: "🌙" }
]
// koordinat kota (lebih akurat dari tebak nama). Kota lain tetap jalan lewat nama kota.
const COORD = {
    bandung: [-6.9175, 107.6191], jakarta: [-6.2088, 106.8456], bekasi: [-6.2383, 106.9756], bogor: [-6.5971, 106.806],
    depok: [-6.4025, 106.7942], tangerang: [-6.1783, 106.63], semarang: [-6.9667, 110.4167], yogyakarta: [-7.7956, 110.3695],
    surabaya: [-7.2575, 112.7521], malang: [-7.9666, 112.6326], medan: [3.5952, 98.6722], palembang: [-2.9761, 104.7754],
    makassar: [-5.1477, 119.4327], denpasar: [-8.6705, 115.2126]
}

const dbA = () => {
    const st = global.db.settings
    if (!st.adzan || typeof st.adzan !== "object") st.adzan = {}
    if (!st.adzan.chats) st.adzan.chats = {}   // chat pribadi yang opt-in (data lama grup diabaikan)
    if (!st.adzan.off) st.adzan.off = {}       // grup yang dimatikan adminnya
    return st.adzan
}
const cfg = () => ({
    kota: (global.db?.settings?.adzan?.kota) || "Bandung",   // sengaja TIDAK baca settings.js; ganti lewat .adzan kota
    negara: global.adzanNegara || "Indonesia",
    zona: global.adzanZona || "Asia/Jakarta",
    label: global.adzanLabel || "WIB",
    audioUrl: global.adzanAudioUrl || "",
    urutan: (global.db?.settings?.adzan?.urutan) || "audio"
})

let SOCK = null
let timings = null        // { date, times, source, hijri }
let loading = null
const fired = new Set()   // "2026-11-09|dzuhur"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function nowZone() {
    const z = cfg().zona
    const d = new Date()
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: z, year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
    const time = new Intl.DateTimeFormat("en-GB", { timeZone: z, hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(/^24:/, "00:")
    return { date, time }
}

async function fetchTimings(date) {
    const c = cfg()
    const [y, mo, d] = date.split("-")
    const co = COORD[c.kota.toLowerCase()]
    const url = co
        ? `https://api.aladhan.com/v1/timings/${d}-${mo}-${y}?latitude=${co[0]}&longitude=${co[1]}&method=20&timezonestring=${encodeURIComponent(c.zona)}`
        : `https://api.aladhan.com/v1/timingsByCity/${d}-${mo}-${y}?city=${encodeURIComponent(c.kota)}&country=${encodeURIComponent(c.negara)}&method=20`
    const ctl = new AbortController()
    const to = setTimeout(() => ctl.abort(), 10000)
    try {
        const res = await fetch(url, { signal: ctl.signal })
        const json = await res.json()
        const t = json?.data?.timings
        if (!t) throw new Error("respon API kosong")
        const times = {}
        for (const p of PRAYERS) times[p.key] = String(t[p.api]).slice(0, 5)
        const h = json.data.date?.hijri
        return { date, times, source: "aladhan (Kemenag RI)", kota: c.kota, hijri: h ? `${h.day} ${h.month?.en || ""} ${h.year} H` : "" }
    } finally { clearTimeout(to) }
}

async function loadTimings(date) {
    const kota = cfg().kota
    if (timings && timings.date === date && timings.kota === kota) return timings
    if (loading) return loading
    loading = (async () => {
        try { timings = await fetchTimings(date) }
        catch (e) {
            console.log("[Adzan] gagal ambil jadwal API, pakai jam cadangan:", e.message)
            timings = { date, kota, times: Object.fromEntries(PRAYERS.map((p) => [p.key, p.fallback])), source: "cadangan (perkiraan)", hijri: "", retryAt: Date.now() + 5 * 60 * 1000 }
        }
        return timings
    })()
    try { return await loading } finally { loading = null }
}

function findAudio(key) {
    for (const base of [`adzan-${key}`, "adzan"])
        for (const ext of ["mp3", "m4a", "ogg", "opus", "wav"]) {
            const f = path.join(MEDIA, `${base}.${ext}`)
            if (fs.existsSync(f)) return { file: f, ext }
        }
    return null
}
const MIME = { mp3: "audio/mpeg", m4a: "audio/mp4", ogg: "audio/ogg; codecs=opus", opus: "audio/ogg; codecs=opus", wav: "audio/wav" }

function nextPrayer(t, time) {
    const list = PRAYERS.map((p) => ({ p, at: t.times[p.key] })).filter((x) => x.at > time).sort((a, b) => a.at.localeCompare(b.at))
    return list[0] || { p: PRAYERS[0], at: t.times[PRAYERS[0].key], besok: true }
}

function buildCaption(p, time, t) {
    const c = cfg()
    const nx = nextPrayer(t, time)
    const tgl = new Intl.DateTimeFormat("id-ID", { timeZone: c.zona, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())
    return `${p.ikon} *WAKTU ADZAN ${p.nama.toUpperCase()}*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🕰️ *${time} ${c.label}*\n` +
        `📍 ${c.kota} dan sekitarnya\n` +
        `📅 ${tgl}${t.hijri ? `\n🌙 ${t.hijri}` : ""}\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `Telah masuk waktu sholat *${p.nama}*. Mari hentikan sejenak aktivitas dan tunaikan sholat tepat waktu. 🤲\n\n` +
        `⏭️ Berikutnya: ${nx.p.nama} ${nx.at} ${c.label}${nx.besok ? " (besok)" : ""}\n\n` +
        `_Matikan di grup ini: .adzan off_`
}

// kirim satu paket (audio + foto) ke satu chat. media dibaca sekali per waktu sholat (pack), bukan per chat
function makePack(p, time, t) {
    const c = cfg()
    const img = path.join(MEDIA, `adzan-${p.key}.jpg`)
    const a = findAudio(p.key)
    return {
        caption: buildCaption(p, time, t),
        image: fs.existsSync(img) ? fs.readFileSync(img) : null,
        audio: a ? { buf: fs.readFileSync(a.file), mime: MIME[a.ext] } : null,
        audioUrl: c.audioUrl,
        urutan: c.urutan
    }
}
async function sendPack(jid, pack) {
    const sendFoto = () => pack.image
        ? SOCK.sendMessage(jid, { image: pack.image, caption: pack.caption })
        : SOCK.sendMessage(jid, { text: pack.caption })
    const sendAudio = async () => {
        if (pack.audio) await SOCK.sendMessage(jid, { audio: pack.audio.buf, mimetype: pack.audio.mime, ptt: false })
        else if (pack.audioUrl) await SOCK.sendMessage(jid, { audio: { url: pack.audioUrl }, mimetype: "audio/mpeg", ptt: false })
    }
    if (pack.urutan === "foto") { await sendFoto(); await sendAudio() }
    else { await sendAudio(); await sendFoto() }
}

const digits = (x) => String(x || "").split(":")[0].split("@")[0]
async function groupTargets() {
    const out = []
    let all = {}
    try { all = await SOCK.groupFetchAllParticipating() } catch (e) { console.log("[Adzan] gagal ambil daftar grup:", e.message); return out }
    const botIds = [SOCK.user?.id, SOCK.user?.lid].filter(Boolean).map(digits)
    const off = dbA().off
    for (const [jid, meta] of Object.entries(all)) {
        if (off[jid]) continue
        if (meta.announce) {   // grup dikunci: cuma admin yang bisa kirim -> bot harus admin
            const botAdmin = (meta.participants || []).some((x) => x.admin && [x.id, x.jid, x.lid, x.phoneNumber].filter(Boolean).map(digits).some((d) => botIds.includes(d)))
            if (!botAdmin) continue
        }
        out.push(jid)
    }
    return out
}

async function broadcast(p, time, t) {
    const pack = makePack(p, time, t)
    const groups = await groupTargets()
    const privates = Object.keys(dbA().chats).filter((j) => dbA().chats[j] && !j.endsWith("@g.us"))
    const jids = [...groups, ...privates]
    console.log(`[Adzan] ${p.nama}: kirim ke ${jids.length} chat`)
    for (const jid of jids) {
        try { await sendPack(jid, pack) }
        catch (e) { console.log(`[Adzan] gagal kirim ke ${jid}:`, e.message) }
        await sleep(1500)   // jeda antar chat supaya aman dari banned
    }
}

async function tick() {
    try {
        if (!SOCK || !global.db?.settings) return
        const { date, time } = nowZone()
        if (timings && timings.retryAt && Date.now() > timings.retryAt) timings = null   // coba lagi ambil jadwal API
        const t = await loadTimings(date)
        for (const p of PRAYERS) {
            if (t.times[p.key] !== time) continue
            const id = `${date}|${p.key}`
            if (fired.has(id)) continue
            fired.add(id)
            if (fired.size > 50) fired.delete(fired.values().next().value)
            console.log(`[Adzan] masuk waktu ${p.nama} (${time})`)
            broadcast(p, time, t).catch((e) => console.log("[Adzan] broadcast error:", e.message))
        }
    } catch (e) { console.log("[Adzan] tick error:", e.message) }
}

function start(sock) {
    SOCK = sock                       // dipanggil lagi saat reconnect: cukup ganti sock, timer tidak dobel
    if (global.__adzanTimer) return
    global.__adzanTimer = setInterval(tick, 1000)   // cek tiap detik supaya tepat di menit masuk waktu
    console.log("[Adzan] pengingat adzan berjalan (default aktif di semua grup)")
}

async function command({ sock, m, command, args, isOwner }) {
    if (command !== "adzan" && command !== "azan") return false
    SOCK = SOCK || sock
    const a = String(args[0] || "").toLowerCase()
    const d = dbA()
    const canSet = !m.isGroup || m.isAdmin || isOwner
    const aktif = m.isGroup ? !d.off[m.chat] : !!d.chats[m.chat]

    if (a === "on" || a === "off") {
        if (!canSet) { await m.reply("❌ Di grup, yang bisa atur adzan cuma admin."); return true }
        if (m.isGroup) { if (a === "on") delete d.off[m.chat]; else d.off[m.chat] = true }
        else { if (a === "on") d.chats[m.chat] = true; else delete d.chats[m.chat] }
        await m.reply(a === "on"
            ? "✅ Adzan *AKTIF* di chat ini.\nBot kirim audio + foto adzan tepat saat masuk waktu sholat."
            : "✅ Adzan *DIMATIKAN* di chat ini.\nNyalakan lagi: .adzan on")
        return true
    }
    if (a === "test") {
        if (!isOwner) { await m.reply("❌ Khusus owner bot."); return true }
        const p = PRAYERS.find((x) => x.key === String(args[1] || "maghrib").toLowerCase()) || PRAYERS[3]
        const t = await loadTimings(nowZone().date)
        await sendPack(m.chat, makePack(p, t.times[p.key], t))
        return true
    }
    if (a === "kota") {
        if (!isOwner) { await m.reply("❌ Khusus owner bot."); return true }
        const nama = args.slice(1).join(" ").trim()
        if (!nama) { await m.reply(`Kota sekarang: *${cfg().kota}*\nGanti: .adzan kota Surabaya`); return true }
        d.kota = nama.replace(/\b\w/g, (x) => x.toUpperCase())
        timings = null
        const t = await loadTimings(nowZone().date)
        await m.reply(`✅ Kota adzan diganti ke *${cfg().kota}*\nJadwal: ${t.source}\n${PRAYERS.map((p) => `${p.nama} ${t.times[p.key]}`).join(" | ")}`)
        return true
    }
    if (a === "urutan") {
        if (!isOwner) { await m.reply("❌ Khusus owner bot."); return true }
        const v = String(args[1] || "").toLowerCase()
        if (v !== "audio" && v !== "foto") { await m.reply(`Urutan sekarang: *${cfg().urutan} dulu*\nGanti: .adzan urutan audio  /  .adzan urutan foto`); return true }
        d.urutan = v
        await m.reply(`✅ Sekarang *${v}* dikirim duluan, lalu ${v === "audio" ? "foto" : "audio"}.`)
        return true
    }
    const t = await loadTimings(nowZone().date)
    const c = cfg()
    const lines = PRAYERS.map((p) => `• ${p.nama.padEnd(8)} ${t.times[p.key]} ${c.label}`).join("\n")
    await m.reply(`🕌 *ADZAN OTOMATIS*\n\nStatus chat ini: *${aktif ? "ON ✅" : "OFF ❌"}*\n\n📍 ${t.kota || c.kota} — ${t.date}${t.hijri ? ` (${t.hijri})` : ""}\n${lines}\n\n_Sumber jadwal: ${t.source}_\n\n.adzan off → matikan di chat ini\n.adzan on  → nyalakan lagi`)
    return true
}

module.exports = { start, command, PRAYERS }
