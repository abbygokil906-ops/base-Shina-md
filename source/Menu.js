/*
  Menu bot: susunan teks + tombol.
  Daftar fitur ada di MenuData.js, tombol ada di Button.js.

  - .menu            -> menu utama (foto + tombol: Pilih kategori, Bahasa, Saluran, Owner) + audio setelah menu
  - .menu <kategori> -> daftar fitur kategori itu (tombol: Pilih kategori, Saluran)
  - .allmenu / row "All Menu" -> semua fitur (tombol: Pilih kategori, Saluran)
  - Tombol Bahasa & Owner HANYA ada di .menu. Bahasa: lihat Lang.js, audio: lihat settings.js
*/
const Button = require("./Button.js")
const { sendNative, urlButton, quickButton, listButton } = Button
const categories = require("./MenuData.js")
const Lang = require("./Lang.js")
const Brand = require("./Brand.js")
const fs = require("fs")

const visibleCategories = (info) =>
    categories.filter((c) => {
        if (c.ownerOnly && !info.isOwner) return false
        return true
    })

// total fitur = jumlah command unik yang tampil di menu (kategori yang terlihat oleh user itu), jadi angkanya selalu sesuai isi menu
const totalFitur = (info) => new Set(visibleCategories(info).flatMap((c) => c.cmds)).size

const categoryText = (c) =>
    `╭─⦏ *Menu ${c.name}* ⦐\n${c.cmds.map((x) => `│ꔹ${x}`).join("\n")}\n╰──────────⌯⌲`

const headerText = (info, L) =>
    [
        `╭─「 🕷️ *${L.infoTitle}* 」`,
        `│ 🤖 *${L.name_}*    : ${info.botName}`,
        `│ 👑 *${L.owner}*   : @${info.owner}`,
        `│ 🥠 *${L.status}*  : ${info.status}`,
        `│ 📊 *${L.limit}*   : ${info.limit}`,
        `│ 🌐 *${L.mode}*    : ${info.mode}`,
        `│ 🏷️ *${L.version}*   : ${info.version}`,
        `│ ⏱️ *${L.runtime}* : ${info.runtime}`,
        `│ 📦 *${L.features}*   : ${totalFitur(info)}`,
        `╰──────────────⦁`
    ].join("\n")

const allMenuText = (info, L) =>
    `${headerText(info, L)}\n\n${visibleCategories(info).map(categoryText).join("\n\n")}\n\n© Powered By ${Brand.hak.nama}`

// ===== Button ON/OFF (per user). OFF = .menu langsung jadi All Menu: foto + teks saja, tanpa tombol (cocok untuk WA Web/laptop) =====
const buttonsOn = (jid) => !(global.db?.users?.[jid]?.noButton)
function setButtons(jid, on) {
    if (!global.db.users) global.db.users = {}
    if (typeof global.db.users[jid] !== "object") global.db.users[jid] = {}
    if (on) delete global.db.users[jid].noButton
    else global.db.users[jid].noButton = true
}
const offFooter = (jid) => (Lang.getLang(jid) === "en" ? "_Button OFF — turn on: .button on_" : "_Button OFF — nyalakan lagi: .button on_")

const ctx = (m, info) => ({
    mentionedJid: [m.sender, info.owner + "@s.whatsapp.net"],
    isForwarded: true,
    forwardingScore: 1,
    forwardedNewsletterMessageInfo: {
        newsletterJid: global.idChannel,
        newsletterName: global.namaCh,
        serverId: 200
    }
})

/**
 * @param sock  socket baileys
 * @param m     pesan masuk
 * @param sub   nama kategori (kosong = menu utama, "all" = semua menu)
 * @param info  { mode, owner, botName, version, runtime, totalFitur }
 */
async function renderMenu(sock, m, sub, info) {
    let key = (sub || "").toLowerCase()
    const plain = !buttonsOn(m.sender)
    if (plain && !key) key = "all"   // button OFF: .menu = All Menu
    const L = Lang.dict(Lang.getLang(m.sender))
    const cats = visibleCategories(info)
    const byKey = Object.fromEntries(cats.map((c) => [c.key, c]))
    const isAll = key === "all" || key === "allmenu"
    const cat = byKey[key]
    const isMain = !isAll && !cat   // menu utama (.menu) saja yang punya tombol Bahasa & Owner
    const tag = `@${m.sender.split("@")[0]}`
    const greet = L.greet(tag)

    if (plain) {
        // tanpa tombol sama sekali: foto + teks saja
        const teks = (isAll ? allMenuText(info, L) : cat ? `${greet}\n\n${categoryText(cat)}` : allMenuText(info, L)) + `\n\n${offFooter(m.sender)}`
        const c = ctx(m, info)
        if (global.thumbnail) return sock.sendMessage(m.chat, { image: global.thumbnail, caption: teks, mentions: c.mentionedJid, contextInfo: c }, { quoted: m })
        return sock.sendMessage(m.chat, { text: teks, mentions: c.mentionedJid, contextInfo: c }, { quoted: m })
    }

    const rows = [
        // All Menu di paling atas daftar
        { title: L.allMenu, description: L.allMenuDesc, id: ".allmenu" },
        ...cats.map((c) => ({
            title: `${c.icon} ${c.name}`,
            description: L.catDesc(c.name),
            id: `.menu ${c.key}`
        }))
    ]

    // Kategori (di atas) -> Saluran. Tombol Bahasa & Owner CUMA di menu utama (.menu).
    const buttons = [listButton(L.btnCategory, `© Powered By ${Brand.hak.nama}`, rows)]
    if (isMain) {
        const cur = Lang.getLang(m.sender)
        buttons.push(listButton(L.btnLanguage, L.langSection, Lang.LANGS.map((code) => ({
            title: `${code === "en" ? "🇬🇧" : "🇮🇩"} ${Lang.DICT[code].name}${code === cur ? " ✅" : ""}`,
            description: L.langDesc,
            id: `.lang ${code}`
        }))))
    }
    buttons.push(urlButton(L.btnChannel, global.linkChannel))
    if (isMain) buttons.push(quickButton(L.btnOwner, ".owner"))
    // tombol promosi script asli (Order Panel Murah / Sumber Script / Script VVIP) sudah dihapus,
    // Brand.orderUrl/sumberUrl/vipLabel sekarang kosong jadi tombol-tombol ini otomatis gak muncul.
    if (isMain && Brand.orderUrl) buttons.push(urlButton(Brand.orderLabel, Brand.orderUrl))
    if (isMain && Brand.sumberUrl) buttons.push(urlButton(Brand.sumberLabel, Brand.sumberUrl))
    if (isMain && Brand.vipLabel) buttons.push(quickButton(Brand.vipLabel, ".scriptvip"))

    const body = isAll
        ? allMenuText(info, L)
        : cat
            ? `${greet}\n\n${categoryText(cat)}\n\n${L.hint}`
            : `${greet}\n\n${headerText(info, L)}\n\n${L.hint}`

    // menu utama (.menu): SATU gelembung. Header = video asli (autoplay), foto tampil sebagai kartu besar terpisah di gelembung yang sama
    // (externalAdReply + renderLargerThumbnail), lalu teks & tombol. Foto dan video tetap dua media terpisah, tidak digabung jadi satu file.
    // File video tidak ada -> foto biasa. Kategori & All Menu tetap foto biasa.
    const useVideo = isMain && global.menuVideo
    const baseCtx = ctx(m, info)
    const fotoCard = useVideo && global.thumbnail && global.menuFotoKartu !== false ? {
        externalAdReply: {
            title: info.botName,
            body: `© Powered By ${Brand.hak.nama}`,
            mediaType: 1,
            renderLargerThumbnail: true,
            showAdAttribution: false,
            thumbnail: global.menuKartuFoto || global.thumbnail,
            sourceUrl: global.linkChannel
        }
    } : {}
    return sendNative(sock, m.chat, {
        ...(useVideo ? { video: global.menuVideo } : { image: global.thumbnail }),
        body,
        footer: `© Powered By ${Brand.hak.nama}`,
        buttons,
        contextInfo: { ...baseCtx, ...fotoCard }
    }, { userJid: m.sender, quoted: m })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const bar = (p) => {
    const n = Math.round(p / 10)
    return `${"▰".repeat(n)}${"▱".repeat(10 - n)} ${p}%`
}
const frame = (p, L) => `${L.wait}\n\n${bar(p)}`

// ===== AUDIO MENU: dikirim SETELAH menu keluar, sebagai voice note (VN), reply-nya ada foto kecil =====
// Diatur di settings.js (bagian media, sama seperti foto): global.audioMenu*
const { execFile } = require("child_process")
const path = require("path")
const os = require("os")

// VN WhatsApp = ogg/opus. File mp3/m4a/wav diubah dulu pakai ffmpeg SEKALI saja, hasilnya disimpan di storage/menu-vn.ogg
// (dan diubah di depan waktu bot nyala lewat warmAudio). Durasi dipotong sesuai global.audioMenuDurasi (settings.js), jadi saat .menu audio langsung terkirim tanpa nunggu konversi.
const opusCache = new Map()
const VN_FILE = path.join(process.cwd(), "storage", "menu-vn.ogg")
async function toOpus(file) {
    if (/\.(ogg|opus)$/i.test(file)) return fs.readFileSync(file)
    const dur = Math.max(0, Number(global.audioMenuDurasi) || 0)   // 0 = utuh
    const key = `${file}:${fs.statSync(file).mtimeMs}:${dur}`
    if (opusCache.has(key)) return opusCache.get(key)
    let buf
    const metaFile = VN_FILE + ".meta"
    try {
        if (fs.existsSync(VN_FILE) && fs.readFileSync(metaFile, "utf8") === key) buf = fs.readFileSync(VN_FILE)
    } catch (e) {}
    if (!buf) {
        fs.mkdirSync(path.dirname(VN_FILE), { recursive: true })
        // durasi > 0: potong dari awal + fade out 3 detik di ujungnya
        const cut = dur > 0 ? ["-t", String(dur), "-af", `afade=t=out:st=${Math.max(0, dur - 3)}:d=3`] : []
        await new Promise((res, rej) => execFile("ffmpeg", ["-y", "-i", file, ...cut, "-vn", "-ac", "1", "-ar", "48000", "-c:a", "libopus", "-b:a", "32k", "-application", "voip", "-f", "ogg", VN_FILE], (e) => (e ? rej(e) : res())))
        buf = fs.readFileSync(VN_FILE)
        try { fs.writeFileSync(metaFile, key) } catch (e) {}
    }
    opusCache.set(key, buf)
    return buf
}

// dipanggil sekali saat bot nyala: siapkan audio VN lebih dulu
async function warmAudio() {
    try {
        const src = global.audioMenuFile
        if (global.audioMenuAktif === false || global.audioMenuVN === false || !src || /^https?:/i.test(src) || !fs.existsSync(src)) return
        await toOpus(src)
    } catch (e) { console.log("[MenuAudio] persiapan audio gagal:", e.message) }
}

// VN: me-reply pesan user, kotak reply-nya juga ada foto kecil (lewat sock.sendMessage -> FotoReply)
async function sendMenuAudio(sock, m) {
    try {
        if (global.audioMenuAktif === false) return
        const src = global.audioMenuFile
        if (!src) return
        const isUrl = /^https?:\/\//i.test(src)
        if (!isUrl && !fs.existsSync(src)) return          // file belum ditaruh -> lewati saja
        const vn = global.audioMenuVN !== false
        let content
        if (vn && !isUrl) {
            try {
                content = { audio: await toOpus(src), mimetype: "audio/ogg; codecs=opus", ptt: true }
            } catch (e) {
                console.log("[MenuAudio] ffmpeg gagal, kirim apa adanya:", e.message)
            }
        }
        if (!content) content = { audio: isUrl ? { url: src } : fs.readFileSync(src), mimetype: "audio/mpeg", ptt: vn }
        await sock.sendMessage(m.chat, content, { quoted: m })
    } catch (e) {
        console.log("[MenuAudio] gagal kirim audio:", e.message)
    }
}

// reaksi dulu -> teks tunggu + loading 10..100 -> baru menu keluar -> terakhir audio
// opts.skipLoading : tanpa animasi loading (dipakai saat ganti bahasa)
// opts.skipAudio   : tanpa audio
async function sendMenu(sock, m, sub, info, opts = {}) {
    const isMain = !sub
    if (!buttonsOn(m.sender)) return renderMenu(sock, m, sub, info)   // button OFF: langsung foto + teks, tanpa loading & audio
    // loading cuma buat menu utama (.menu). Kategori & All Menu langsung keluar tanpa loading.
    if (!isMain) return renderMenu(sock, m, sub, info)
    if (opts.skipLoading) {
        await renderMenu(sock, m, sub, info)
        if (!opts.skipAudio) await sendMenuAudio(sock, m)
        return
    }

    const L = Lang.dict(Lang.getLang(m.sender))
    let loading
    try {
        await sock.sendMessage(m.chat, { react: { text: "⏳", key: m.key } })
        loading = await sock.sendMessage(m.chat, { text: frame(0, L) }, { quoted: m })
        for (let p = 10; p <= 100; p += 10) {
            await sleep(500)
            await sock.sendMessage(m.chat, { text: frame(p, L), edit: loading.key })
        }
        await sleep(300)
    } catch (e) {}

    await renderMenu(sock, m, sub, info)

    // audio langsung menyusul setelah menu tampil (jalan bareng hapus loading & reaksi, biar cepat)
    const audio = opts.skipAudio ? null : sendMenuAudio(sock, m)
    try {
        if (loading) await sock.sendMessage(m.chat, { delete: loading.key })
        await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } })
    } catch (e) {}
    if (audio) await audio
}

module.exports = { sendMenu, warmAudio, totalFitur, buttonsOn, setButtons }
