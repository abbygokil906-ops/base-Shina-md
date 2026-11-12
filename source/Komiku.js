/*
  Komiku — kategori baca komik (manga / manhwa / manhua) lewat API /komiku/*.
  SEMUA fitur kategori ini ada di SATU file ini (daftar FITUR di bagian bawah) -> kalau mau update cukup timpa file ini.

  Alur pakai:
    .komikterbaru / .komikpopuler / .komikcari <judul> / .komikgenre <genre> / .komiktype <tipe> / .komikrandom / .komiku (beranda)
      -> keluar daftar bernomor
    .komikdetail <nomor>      -> info komik + daftar chapter bernomor
    .komikchapter <nomor>     -> kirim chapter sebagai PDF  (tambah "img" di belakang = kirim sebagai gambar)
    .komiknext / .komikprev   -> chapter berikutnya / sebelumnya
    .komikfav, .komikriwayat, .komiklanjut -> favorit, riwayat baca, lanjut baca

  Ada 2 sumber komik: "komiku" (/komiku/*, pakai slug) dan "komik" (/komik/*, pakai link/url). Daftar dari sumber kedua
  dibuka lewat .komik2home / .komik2update / .komik2browse / .komik2cari, lalu .komikdetail, .komikchapter, .komiknext,
  .komikprev, .komikfav dst otomatis mengikuti sumber daftar yang sedang dipakai.

  Data favorit & riwayat baca disimpan di database/komiku.json (lihat source/DbPath.js).
  Bentuk JSON API dibaca secara longgar (nama field judul/slug/cover dll dicari otomatis). Kalau tampilan ada yang
  aneh, owner bisa kirim `.komikdebug <endpoint> <parameter>` untuk melihat respons mentah API.
*/
const fs = require("fs")
const axios = require("axios")
const { createLoader, Usage } = require("./PluginLoader.js")
const { call, HTTP } = require("./ApiTool.js")
const DBP = require("./DbPath.js")

const SECTION = "komiku"
// 2 sumber API: parameter detail/chapter dan section-nya beda
const SRC = {
    komiku: { section: "komiku", detail: "detail", detailParam: "slug", chapter: "chapter", chapterParam: "slug" },
    komik: { section: "komik", detail: "detail", detailParam: "url", chapter: "read", chapterParam: "url" }
}
const srcOf = (v) => SRC[v] || SRC.komiku
const apiDetail = (src, ref) => api(srcOf(src).detail, { [srcOf(src).detailParam]: ref }, srcOf(src).section)
const apiChapter = (src, ref) => api(srcOf(src).chapter, { [srcOf(src).chapterParam]: ref }, srcOf(src).section)
const MAX_PAGES = 150          // batas halaman per chapter
const MAX_IMG_SEND = 20        // batas gambar kalau chapter dikirim sebagai foto
const PDF_MAX_WIDTH = 1400     // gambar non-JPEG diperkecil kalau lebih lebar dari ini
const REFERER = "https://komiku.org/"
const UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"

/* ================= util baca JSON API ================= */
const S = (v) => {
    if (v == null) return ""
    if (typeof v === "string" || typeof v === "number") return String(v).trim()
    if (Array.isArray(v)) return v.map(S).filter(Boolean).join(", ")
    if (typeof v === "object") return S(v.title ?? v.name ?? v.text ?? v.label ?? v.chapter ?? "")
    return ""
}
const first = (o, keys) => {
    if (!o || typeof o !== "object") return ""
    for (const k of keys) { const v = S(o[k]); if (v) return v }
    return ""
}
const lastSeg = (s) => String(s).split(/[?#]/)[0].split("/").filter(Boolean).pop() || ""
const slugFrom = (o) => {
    let s = first(o, ["slug", "endpoint", "id", "manga_id"])
    if (!s) s = first(o, ["url", "link", "href"])
    return lastSeg(s)
}
const slugify = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
const uniq = (a) => [...new Set(a)]
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + "…" : String(s))
const pageNum = (v) => Math.max(1, parseInt(v) || 1)
const rootOf = (json) => (json && (json.result ?? json.data)) ?? json

function normItem(o) {
    if (!o || typeof o !== "object") return null
    const title = first(o, ["title", "judul", "name", "komik", "manga"])
    if (!title) return null
    return {
        title,
        slug: slugFrom(o),
        url: first(o, ["url", "link", "href"]),
        chapter: first(o, ["chapter", "latestChapter", "latest_chapter", "lastChapter", "last_chapter", "chapter_terbaru", "newestChapter", "latest"]),
        type: first(o, ["type", "tipe"]),
        genre: first(o, ["genre", "genres"]),
        rating: first(o, ["rating", "score"]),
        views: first(o, ["views", "viewers", "view"]),
        updated: first(o, ["updated", "update", "time", "date", "waktu"]),
        image: first(o, ["image", "thumbnail", "thumb", "cover", "poster", "img"])
    }
}

const isObjArr = (a) => Array.isArray(a) && a.length > 0 && a.some((x) => x && typeof x === "object" && !Array.isArray(x))
const GENERIC = /^(results?|data|list|items?|komik|comics?|mangas?|series)$/i

// cari kumpulan daftar komik di respons -> [{ name, items:[normItem] }]
function sectionsOf(json) {
    const root = rootOf(json)
    const raw = []
    if (isObjArr(root)) raw.push({ name: "", arr: root })
    else if (root && typeof root === "object") {
        for (const [k, v] of Object.entries(root)) {
            if (isObjArr(v)) raw.push({ name: k, arr: v })
            else if (v && typeof v === "object" && !Array.isArray(v)) {
                for (const [k2, v2] of Object.entries(v)) if (isObjArr(v2)) raw.push({ name: GENERIC.test(k2) ? k : k2, arr: v2 })
            }
        }
    }
    return raw
        .map((s) => ({ name: GENERIC.test(s.name) ? "" : s.name.replace(/[_-]+/g, " "), items: s.arr.map(normItem).filter(Boolean) }))
        .filter((s) => s.items.length)
}

function chapterList(root) {
    const norm = (arr) => arr.map((c, i) => {
        if (typeof c === "string") return { title: lastSeg(c) || `Chapter ${i + 1}`, slug: lastSeg(c), url: HTTP.test(c) ? c : "", time: "" }
        const slug = slugFrom(c)
        return { title: first(c, ["title", "name", "chapter", "judul"]) || `Chapter ${i + 1}`, slug, url: first(c, ["url", "link", "href"]), time: first(c, ["date", "time", "updated", "tanggal", "waktu"]) }
    }).filter((c) => c.slug)
    const keys = /chapter|chapters|list|daftar|episodes?/i
    const scan = (o, d = 0) => {
        if (!o || typeof o !== "object" || d > 2) return null
        for (const [k, v] of Object.entries(o)) if (Array.isArray(v) && v.length && keys.test(k)) { const r = norm(v); if (r.length) return r }
        for (const v of Object.values(o)) { if (v && typeof v === "object" && !Array.isArray(v)) { const r = scan(v, d + 1); if (r) return r } }
        return null
    }
    return scan(root) || []
}

function normDetail(json, slugArg, src = "komiku") {
    const root = rootOf(json)
    const o = (root && (root.detail || root.info || root.komik || root.manga)) || root || {}
    const d = {
        src,
        slug: slugArg,
        title: first(o, ["title", "judul", "name"]) || slugArg,
        image: first(o, ["image", "thumbnail", "thumb", "cover", "poster", "img"]),
        synopsis: first(o, ["synopsis", "sinopsis", "description", "deskripsi", "desc", "summary"]),
        author: first(o, ["author", "penulis", "pengarang", "creator"]),
        status: first(o, ["status"]),
        type: first(o, ["type", "tipe"]),
        genre: first(o, ["genre", "genres"]),
        rating: first(o, ["rating", "score"]),
        released: first(o, ["released", "release", "rilis", "year", "tahun"]),
        chapters: chapterList(root)
    }
    // sumber "komik" memakai link penuh sebagai acuan chapter
    if (src === "komik") d.chapters = d.chapters.map((c) => ({ ...c, slug: c.url || c.slug }))
    return d
}

// link halaman chapter dari respons API
function pageUrls(json) {
    const root = rootOf(json)
    const take = (arr) => arr
        .map((x) => (typeof x === "string" ? x : x && typeof x === "object" ? x.url || x.src || x.image || x.img || x.link || "" : ""))
        .filter((u) => typeof u === "string" && HTTP.test(u.trim()))
        .map((u) => u.trim())
    if (Array.isArray(root)) { const r = take(root); if (r.length) return uniq(r) }
    if (root && typeof root === "object") {
        for (const k of ["images", "image", "pages", "panels", "panel", "gambar", "chapter_images", "data", "result"]) {
            if (Array.isArray(root[k])) { const r = take(root[k]); if (r.length) return uniq(r) }
        }
        for (const v of Object.values(root)) if (Array.isArray(v)) { const r = take(v); if (r.length >= 2) return uniq(r) }
    }
    const out = new Set()
    const walk = (v, d = 0) => {
        if (out.size >= MAX_PAGES || d > 5 || v == null) return
        if (typeof v === "string") { if (HTTP.test(v.trim()) && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(v)) out.add(v.trim()); return }
        if (typeof v === "object") for (const x of Array.isArray(v) ? v : Object.values(v)) walk(x, d + 1)
    }
    walk(root)
    return [...out]
}

const chapNum = (t) => {
    const s = String(t)
    const m = s.match(/(?:chapter|ch\.?|bab)\s*(\d+(?:[.,]\d+)?)/i) || s.match(/(\d+(?:[.,]\d+)?)\s*$/) || s.match(/(\d+(?:[.,]\d+)?)/)
    return m ? parseFloat(m[1].replace(",", ".")) : NaN
}
const newestFirst = (chs) => {
    if (chs.length < 2) return true
    const a = chapNum(chs[0].title), b = chapNum(chs[chs.length - 1].title)
    return Number.isNaN(a) || Number.isNaN(b) ? true : a >= b
}

/* ================= panggil API ================= */
async function api(endpoint, params = {}, section = SECTION) {
    const r = await call(endpoint, params, 60000, section)
    if (!r.json) throw new Error("Respons API tidak dikenali")
    return r.json
}

/* ================= database (favorit & riwayat) -> database/komiku.json ================= */
const DB_FILE = DBP("komiku.json")
let db = null, saveTimer = null
function loadDb() {
    if (db) return db
    try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) } catch (_) { db = {} }
    if (!db.users || typeof db.users !== "object") db.users = {}
    return db
}
function saveDb() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)) } catch (e) { console.log("[Komiku] gagal simpan database:", e.message) }
    }, 1500)
}
function userOf(m) {
    const d = loadDb()
    const u = (d.users[m.sender] = d.users[m.sender] || {})
    if (!Array.isArray(u.fav)) u.fav = []
    if (!Array.isArray(u.history)) u.history = []
    return u
}
function addHistory(m, d, ch) {
    const u = userOf(m)
    u.history = u.history.filter((h) => !(h.slug === d.slug && (h.src || "komiku") === (d.src || "komiku")))
    u.history.unshift({ slug: d.slug, src: d.src || "komiku", title: d.title, chapter: ch.title, chapterSlug: ch.slug, time: Date.now() })
    u.history = u.history.slice(0, 30)
    saveDb()
}

/* ================= sesi (hasil terakhir per user, supaya bisa pilih pakai nomor) ================= */
const sessions = new Map()
const sessOf = (m) => { if (!sessions.has(m.sender)) sessions.set(m.sender, {}); return sessions.get(m.sender) }

function pickKomik(m, arg) {
    const s = sessOf(m)
    const a = String(arg || "").trim()
    if (/^\d{1,3}$/.test(a)) {
        const it = s.list && s.list[+a - 1]
        if (!it || !it.slug) throw new Usage(`Nomor ${a} tidak ada di daftar terakhir.\nBuka daftar dulu: .komikterbaru, .komikpopuler, .komikcari <judul>`)
        return it
    }
    if (!a) {
        if (s.detail) return s.detail
        throw new Usage()
    }
    const src = s.src || "komiku"
    return { slug: HTTP.test(a) ? (src === "komik" ? a : lastSeg(a)) : src === "komik" ? a : slugify(a), title: a, src }
}

/* ================= tampilan ================= */
const ICON = { terbaru: "🆕", populer: "🔥", rekomendasi: "👍", update: "🆕" }
function lineOf(it, n) {
    const meta = [it.chapter, it.type, it.rating ? "⭐" + it.rating : "", it.updated].filter(Boolean).join(" • ")
    return `${n}. *${clip(it.title, 60)}*${meta ? `\n    ↳ ${clip(meta, 70)}` : ""}`
}

async function showList(ctx, json, header, footer, perSection = 20, src = "komiku") {
    const { m } = ctx
    const sections = sectionsOf(json)
    const s = sessOf(m)
    s.src = src
    if (!sections.length) {
        const raw = JSON.stringify(rootOf(json), null, 1) || "kosong"
        return m.reply(`📚 *${header}*\n\nHasil tidak ditemukan / bentuk data belum dikenali.\n\n${clip(raw, 1200)}`)
    }
    s.list = []
    let n = 0
    const parts = []
    for (const sec of sections) {
        const lines = []
        for (const it of sec.items.slice(0, perSection)) {
            n++
            s.list.push({ ...it, slug: src === "komik" ? it.url || it.slug : it.slug, src })
            lines.push(lineOf(it, n))
        }
        const icon = ICON[sec.name.toLowerCase()] || "📌"
        parts.push((sec.name ? `${icon} *${sec.name.toUpperCase()}*\n` : "") + lines.join("\n"))
    }
    const text = `📚 *${header}*\n\n${parts.join("\n\n")}\n\n${footer}`
    await m.reply(clip(text, 3800))
}

async function showDetail(ctx, slug, titleHint, src = "komiku") {
    const { sock, m } = ctx
    const json = await apiDetail(src, slug)
    const d = normDetail(json, slug, src)
    if (!d.title || d.title === slug) d.title = titleHint || d.title
    const s = sessOf(m)
    s.src = src
    s.detail = d
    s.chIdx = null
    const info = [
        `📖 *${d.title}*`,
        d.type && `🏷️ Tipe : ${d.type}`,
        d.status && `📌 Status : ${d.status}`,
        d.author && `✍️ Author : ${clip(d.author, 60)}`,
        d.genre && `🎭 Genre : ${clip(d.genre, 100)}`,
        d.rating && `⭐ Rating : ${d.rating}`,
        d.released && `📅 Rilis : ${d.released}`,
        d.chapters.length && `📚 Chapter : ${d.chapters.length}`,
        d.synopsis && `\n📝 ${clip(d.synopsis, 500)}`
    ].filter(Boolean).join("\n")
    let sent = false
    if (d.image && HTTP.test(d.image)) {
        try { await sock.sendMessage(m.chat, { image: { url: d.image }, caption: info }, { quoted: m }); sent = true } catch (_) {}
    }
    if (!sent) await m.reply(info)

    if (!d.chapters.length) return m.reply("Daftar chapter tidak ditemukan untuk komik ini.")
    const show = d.chapters.slice(0, 40)
    const lines = show.map((c, i) => `${i + 1}. ${clip(c.title, 50)}${c.time ? ` _(${clip(c.time, 20)})_` : ""}`)
    await m.reply(
        `📑 *Daftar Chapter*\n\n${lines.join("\n")}${d.chapters.length > show.length ? `\n… dan ${d.chapters.length - show.length} chapter lainnya` : ""}\n\n` +
        `▶️ Baca: *${m.prefix || "."}komikchapter <nomor>*\n⭐ Simpan: *${m.prefix || "."}komikfav add*`
    )
}

/* ================= kirim chapter ================= */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function download(url) {
    let err
    for (let i = 0; i < 3; i++) {
        try {
            const res = await axios.get(url, { responseType: "arraybuffer", timeout: 30000, maxContentLength: 40 * 1024 * 1024, headers: { Referer: REFERER, "User-Agent": UA } })
            const buf = Buffer.from(res.data)
            if (buf.length < 500) throw new Error("gambar kosong")
            return buf
        } catch (e) { err = e; await sleep(600 * (i + 1)) }
    }
    throw err
}

async function pool(items, size, fn) {
    const out = new Array(items.length)
    let i = 0
    await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
        while (i < items.length) { const k = i++; out[k] = await fn(items[k], k).catch(() => null) }
    }))
    return out
}

/* ---------- PDF (tanpa library: JPEG langsung dimasukkan ke PDF) ---------- */
function jpegInfo(b) {
    if (!b || b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null
    let i = 2
    while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue }
        const mk = b[i + 1]
        if (mk === 0xff) { i++; continue }
        if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7), c: b[i + 9] }
        if (mk === 0xd8 || mk === 0x01 || (mk >= 0xd0 && mk <= 0xd7)) { i += 2; continue }
        i += 2 + b.readUInt16BE(i + 2)
    }
    return null
}

// apa pun formatnya (webp/png/gif/jpeg aneh) -> { jpg, w, h, c }
async function toJpegPage(buf) {
    const info = jpegInfo(buf)
    if (info && (info.c === 1 || info.c === 3) && info.w > 0 && info.h > 0) return { jpg: buf, w: info.w, h: info.h, c: info.c }
    try {
        const { createCanvas, loadImage } = require("@napi-rs/canvas")
        const img = await loadImage(buf)
        const k = Math.min(1, PDF_MAX_WIDTH / img.width)
        const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k))
        const cv = createCanvas(w, h)
        const cx = cv.getContext("2d")
        cx.fillStyle = "#fff"; cx.fillRect(0, 0, w, h)
        cx.drawImage(img, 0, 0, w, h)
        return { jpg: cv.toBuffer("image/jpeg", 85), w, h, c: 3 }
    } catch (_) {
        const Jimp = require("jimp")
        const im = await Jimp.read(buf)
        if (im.bitmap.width > PDF_MAX_WIDTH) im.resize(PDF_MAX_WIDTH, Jimp.AUTO)
        const jpg = await im.quality(85).getBufferAsync(Jimp.MIME_JPEG)
        return { jpg, w: im.bitmap.width, h: im.bitmap.height, c: 3 }
    }
}

function buildPdf(pages, title = "Komik") {
    const chunks = []
    const offs = []
    let len = 0
    const push = (x) => { const b = Buffer.isBuffer(x) ? x : Buffer.from(x, "latin1"); chunks.push(b); len += b.length }
    const begin = (n) => { offs[n] = len; push(`${n} 0 obj\n`) }
    const total = 3 + pages.length * 3
    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")
    begin(1); push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    begin(2); push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`)
    const safeTitle = String(title).replace(/[^\x20-\x7e]/g, "").replace(/[()\\]/g, "")
    begin(total); push(`<< /Title (${safeTitle}) /Producer (Fuyuha Shina MD) >>\nendobj\n`)
    pages.forEach((p, i) => {
        const pn = 3 + i * 3, cn = pn + 1, imn = pn + 2
        const k = Math.min(1, 14000 / Math.max(p.w, p.h))
        const W = +(p.w * k).toFixed(2), H = +(p.h * k).toFixed(2)
        begin(pn); push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${imn} 0 R >> >> /Contents ${cn} 0 R >>\nendobj\n`)
        const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`
        begin(cn); push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`)
        begin(imn)
        push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /${p.c === 1 ? "DeviceGray" : "DeviceRGB"} /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`)
        push(p.jpg); push("\nendstream\nendobj\n")
    })
    const xref = len
    push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`)
    for (let n = 1; n <= total; n++) push(`${String(offs[n]).padStart(10, "0")} 00000 n \n`)
    push(`trailer\n<< /Size ${total + 1} /Root 1 0 R /Info ${total} 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
    return Buffer.concat(chunks)
}

const safeName = (s) => String(s).replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "komik"

async function sendChapter(ctx, ch, mode) {
    const { sock, m } = ctx
    const s = sessOf(m)
    const d = s.detail
    const src = (d && d.src) || s.src || "komiku"
    const json = await apiChapter(src, ch.slug)
    const urls = pageUrls(json).slice(0, MAX_PAGES)
    if (!urls.length) throw new Error("Halaman chapter tidak ditemukan")

    const komikTitle = d ? d.title : first(rootOf(json) || {}, ["title", "komik", "manga"]) || "Komik"
    const head = `📖 *${komikTitle}*\n${ch.title}`
    const nav = `\n\n➡️ ${m.prefix || "."}komiknext   ⬅️ ${m.prefix || "."}komikprev`

    if (mode === "img") {
        const list = urls.slice(0, MAX_IMG_SEND)
        for (let i = 0; i < list.length; i++) {
            try { await sock.sendMessage(m.chat, { image: { url: list[i] }, caption: i === 0 ? head : "" }, { quoted: m }) } catch (_) {}
        }
        if (urls.length > list.length) await m.reply(`Baru ${list.length} dari ${urls.length} halaman dikirim sebagai gambar. Pakai tanpa "img" biar dapat PDF lengkap.`)
        else await m.reply(`✅ ${list.length} halaman terkirim.${nav}`)
    } else {
        await m.reply(`⏳ Menyiapkan *${ch.title}* (${urls.length} halaman), tunggu sebentar...`)
        const got = await pool(urls, 5, async (u) => toJpegPage(await download(u)))
        const pages = got.filter(Boolean)
        if (!pages.length) throw new Error("Semua halaman gagal diunduh")
        const pdf = buildPdf(pages, `${komikTitle} - ${ch.title}`)
        const miss = urls.length - pages.length
        await sock.sendMessage(m.chat, {
            document: pdf,
            mimetype: "application/pdf",
            fileName: `${safeName(komikTitle)} - ${safeName(ch.title)}.pdf`,
            caption: `${head}\n📄 ${pages.length} halaman${miss ? ` (${miss} gagal diunduh)` : ""}${nav}`
        }, { quoted: m })
    }
    if (d) addHistory(m, d, ch)
}

function chapterByStep(m, step) {
    const s = sessOf(m)
    if (!s.detail || s.chIdx == null) throw new Usage("Belum ada chapter yang dibaca. Buka dulu: .komikdetail <nomor> lalu .komikchapter <nomor>")
    const chs = s.detail.chapters
    const dir = newestFirst(chs) ? -step : step
    const idx = s.chIdx + dir
    if (idx < 0 || idx >= chs.length) throw new Usage(step > 0 ? "Ini sudah chapter terbaru 🎉" : "Ini sudah chapter pertama.")
    s.chIdx = idx
    return chs[idx]
}

/* ================= daftar fitur ================= */
const P = (ctx, n = 0) => ctx.args[n]
const listFeature = ({ name, command, endpoint, header, desc, usage, example, params, footer }) => ({
    name, command, desc, usage, example,
    async run(ctx) {
        const p = params ? params(ctx) : {}
        const json = await api(endpoint, p)
        const pg = p.page ? ` (hal ${p.page})` : ""
        const next = p.page ? `\n➡️ Halaman berikut: *${ctx.m.prefix || "."}${ctx.command} ${footer ? footer(ctx, p) : p.page + 1}*` : ""
        await showList(ctx, json, header(p) + pg, `🔎 Buka detail: *${ctx.m.prefix || "."}komikdetail <nomor>*${next}`)
    }
})

const FITUR = [
    {
        name: "komiku",
        command: ["komiku", "komikhome", "komik"],
        desc: "Beranda Komiku",
        async run(ctx) {
            const json = await api("home")
            await showList(ctx, json, "Komiku — Beranda", `🔎 Buka detail: *${ctx.m.prefix || "."}komikdetail <nomor>*\n📚 Menu lengkap: *${ctx.m.prefix || "."}menu komiku*`, 6)
        }
    },
    listFeature({
        name: "komikterbaru", command: ["komikterbaru", "komikbaru"], endpoint: "terbaru",
        desc: "Komik update terbaru", usage: "[halaman]", example: "2",
        header: () => "Komik Terbaru", params: (c) => ({ page: pageNum(P(c)) }), footer: (c, p) => p.page + 1
    }),
    listFeature({
        name: "komikpopuler", command: ["komikpopuler", "komikpopular"], endpoint: "populer",
        desc: "Komik paling populer", usage: "[halaman]", example: "2",
        header: () => "Komik Populer", params: (c) => ({ page: pageNum(P(c)) }), footer: (c, p) => p.page + 1
    }),
    {
        name: "komikrandom",
        command: ["komikrandom", "randomkomik"],
        desc: "Komik acak",
        async run(ctx) {
            const json = await api("random")
            const root = rootOf(json)
            const o = (root && (root.detail || root.info || root.komik || root.manga)) || root || {}
            const slug = slugFrom(o) || (sectionsOf(json)[0] || { items: [] }).items.map((i) => i.slug).find(Boolean)
            if (!slug) throw new Error("Komik acak tidak ditemukan, coba lagi")
            await showDetail(ctx, slug, first(o, ["title", "judul", "name"]))
        }
    },
    {
        name: "komikcari",
        command: ["komikcari", "komiksearch", "carikomik"],
        desc: "Cari komik",
        usage: "<judul>|<halaman>",
        example: "solo leveling",
        async run(ctx) {
            const [q, pg] = ctx.text.split("|").map((x) => x.trim())
            if (!q) throw new Usage()
            const page = pageNum(pg)
            const json = await api("search", { q, page })
            await showList(ctx, json, `Hasil "${clip(q, 30)}" (hal ${page})`,
                `🔎 Buka detail: *${ctx.m.prefix || "."}komikdetail <nomor>*\n➡️ Halaman berikut: *${ctx.m.prefix || "."}komikcari ${q}|${page + 1}*`)
        }
    },
    {
        name: "komikgenre",
        command: ["komikgenre", "genrekomik"],
        desc: "Komik berdasarkan genre",
        usage: "<genre> [halaman]",
        example: "action 2",
        async run(ctx) {
            const args = [...ctx.args]
            if (!args.length) throw new Usage(`*Cara pakai:*\n${ctx.prefix}komikgenre <genre> [halaman]\n\n*Contoh:*\n${ctx.prefix}komikgenre action\n${ctx.prefix}komikgenre romance 2\n\nGenre umum: action, adventure, comedy, drama, fantasy, horror, isekai, romance, school-life, slice-of-life`)
            const page = args.length > 1 && /^\d+$/.test(args[args.length - 1]) ? pageNum(args.pop()) : 1
            const genre = slugify(args.join(" "))
            const json = await api("genre", { genre, page })
            await showList(ctx, json, `Genre ${genre} (hal ${page})`,
                `🔎 Buka detail: *${ctx.prefix}komikdetail <nomor>*\n➡️ Halaman berikut: *${ctx.prefix}komikgenre ${genre} ${page + 1}*`)
        }
    },
    {
        name: "komiktype",
        command: ["komiktype", "komiktipe"],
        desc: "Komik berdasarkan tipe (manga/manhwa/manhua)",
        usage: "<manga|manhwa|manhua> [halaman]",
        example: "manhwa 2",
        async run(ctx) {
            const type = String(ctx.args[0] || "").toLowerCase()
            if (!["manga", "manhwa", "manhua"].includes(type)) throw new Usage()
            const page = pageNum(ctx.args[1])
            const json = await api("type", { type, page })
            await showList(ctx, json, `Tipe ${type} (hal ${page})`,
                `🔎 Buka detail: *${ctx.prefix}komikdetail <nomor>*\n➡️ Halaman berikut: *${ctx.prefix}komiktype ${type} ${page + 1}*`)
        }
    },
    {
        name: "komikdetail",
        command: ["komikdetail", "detailkomik"],
        desc: "Detail komik + daftar chapter",
        usage: "<nomor daftar | slug | link>",
        example: "1",
        async run(ctx) {
            const it = pickKomik(ctx.m, ctx.text)
            await showDetail(ctx, it.slug, it.title, it.src || "komiku")
        }
    },
    {
        name: "komikchapter",
        command: ["komikchapter", "bacakomik", "komikbaca"],
        desc: "Baca chapter (PDF / gambar)",
        usage: "<nomor chapter | slug chapter> [img]",
        example: "1",
        async run(ctx) {
            const args = ctx.args.filter((a) => !/^(img|foto|gambar)$/i.test(a))
            const mode = args.length !== ctx.args.length ? "img" : "pdf"
            const a = (args[0] || "").trim()
            if (!a) throw new Usage()
            const s = sessOf(ctx.m)
            let ch
            if (/^\d{1,4}$/.test(a)) {
                if (!s.detail) throw new Usage("Buka detail komik dulu: .komikdetail <nomor>, baru pilih chapter-nya.")
                ch = s.detail.chapters[+a - 1]
                if (!ch) throw new Usage(`Chapter nomor ${a} tidak ada (total ${s.detail.chapters.length}).`)
                s.chIdx = +a - 1
            } else {
                const slug = HTTP.test(a) && (s.src || "komiku") !== "komik" ? lastSeg(a) : a
                const idx = s.detail ? s.detail.chapters.findIndex((c) => c.slug === slug) : -1
                ch = idx >= 0 ? s.detail.chapters[idx] : { title: slug, slug }
                s.chIdx = idx >= 0 ? idx : null
            }
            await sendChapter(ctx, ch, mode)
        }
    },
    {
        name: "komiknext",
        command: ["komiknext", "komiklanjutan", "nextchapter"],
        desc: "Chapter berikutnya",
        async run(ctx) { await sendChapter(ctx, chapterByStep(ctx.m, 1), "pdf") }
    },
    {
        name: "komikprev",
        command: ["komikprev", "komiksebelumnya", "prevchapter"],
        desc: "Chapter sebelumnya",
        async run(ctx) { await sendChapter(ctx, chapterByStep(ctx.m, -1), "pdf") }
    },
    {
        name: "komikfav",
        command: ["komikfav", "komikfavorit"],
        desc: "Favorit komik",
        usage: "[add|del] [nomor]",
        example: "add",
        async run(ctx) {
            const u = userOf(ctx.m)
            const s = sessOf(ctx.m)
            const sub = String(ctx.args[0] || "").toLowerCase()
            if (sub === "add" || sub === "tambah") {
                const it = ctx.args[1] ? pickKomik(ctx.m, ctx.args[1]) : s.detail
                if (!it || !it.slug) throw new Usage("Buka detail komiknya dulu (.komikdetail <nomor>) atau pakai: .komikfav add <nomor daftar>")
                if (u.fav.some((f) => f.slug === it.slug)) return ctx.m.reply(`⭐ *${it.title}* sudah ada di favorit.`)
                if (u.fav.length >= 100) throw new Usage("Favorit penuh (maks 100). Hapus dulu pakai .komikfav del <nomor>")
                u.fav.push({ slug: it.slug, title: it.title, src: it.src || "komiku" })
                saveDb()
                return ctx.m.reply(`⭐ *${it.title}* ditambahkan ke favorit.`)
            }
            if (sub === "del" || sub === "hapus") {
                const n = parseInt(ctx.args[1])
                if (!n || !u.fav[n - 1]) throw new Usage("Pakai: .komikfav del <nomor favorit>")
                const [gone] = u.fav.splice(n - 1, 1)
                saveDb()
                return ctx.m.reply(`🗑️ *${gone.title}* dihapus dari favorit.`)
            }
            if (!u.fav.length) return ctx.m.reply(`⭐ Favorit kamu masih kosong.\nBuka detail komik lalu ketik *${ctx.prefix}komikfav add*`)
            s.list = u.fav.map((f) => ({ ...f, src: f.src || "komiku" }))
            await ctx.m.reply(
                `⭐ *Favorit Kamu*\n\n${u.fav.map((f, i) => `${i + 1}. ${clip(f.title, 60)}`).join("\n")}\n\n` +
                `🔎 Buka: *${ctx.prefix}komikdetail <nomor>*\n🗑️ Hapus: *${ctx.prefix}komikfav del <nomor>*`
            )
        }
    },
    {
        name: "komikriwayat",
        command: ["komikriwayat", "komikhistory"],
        desc: "Riwayat baca",
        async run(ctx) {
            const u = userOf(ctx.m)
            if (!u.history.length) return ctx.m.reply(`🕘 Belum ada riwayat baca.\nMulai dari *${ctx.prefix}komikterbaru*`)
            sessOf(ctx.m).list = u.history.map((h) => ({ slug: h.slug, title: h.title, src: h.src || "komiku" }))
            await ctx.m.reply(
                `🕘 *Riwayat Baca*\n\n${u.history.slice(0, 15).map((h, i) => `${i + 1}. *${clip(h.title, 50)}*\n    ↳ ${clip(h.chapter, 40)}`).join("\n")}\n\n` +
                `🔎 Buka: *${ctx.prefix}komikdetail <nomor>*\n▶️ Lanjut baca terakhir: *${ctx.prefix}komiklanjut*`
            )
        }
    },
    {
        name: "komiklanjut",
        command: ["komiklanjut", "lanjutbaca"],
        desc: "Lanjut baca chapter berikutnya dari komik terakhir",
        async run(ctx) {
            const h = userOf(ctx.m).history[0]
            if (!h) throw new Usage(`Belum ada riwayat baca. Mulai dari ${ctx.prefix}komikterbaru`)
            const hsrc = h.src || "komiku"
            const json = await apiDetail(hsrc, h.slug)
            const d = normDetail(json, h.slug, hsrc)
            if (!d.title || d.title === h.slug) d.title = h.title
            const s = sessOf(ctx.m)
            s.detail = d
            const idx = d.chapters.findIndex((c) => c.slug === h.chapterSlug)
            if (idx < 0) throw new Usage(`Chapter terakhir "${h.chapter}" tidak ditemukan. Pilih manual: ${ctx.prefix}komikdetail ${h.slug}`)
            s.chIdx = idx
            await sendChapter(ctx, chapterByStep(ctx.m, 1), "pdf")
        }
    },
    {
        name: "komik2home",
        command: ["komik2home", "komik2", "komikx"],
        desc: "Beranda sumber komik ke-2",
        async run(ctx) {
            const json = await api("home", {}, "komik")
            await showList(ctx, json, "Komik — Beranda (sumber 2)", `🔎 Buka detail: *${ctx.prefix}komikdetail <nomor>*\n📚 Menu lengkap: *${ctx.prefix}menu komiku*`, 8, "komik")
        }
    },
    {
        name: "komik2update",
        command: ["komik2update", "komik2terbaru"],
        desc: "Update komik terbaru (sumber 2)",
        async run(ctx) {
            const json = await api("update", {}, "komik")
            await showList(ctx, json, "Komik Update (sumber 2)", `🔎 Buka detail: *${ctx.prefix}komikdetail <nomor>*`, 25, "komik")
        }
    },
    {
        name: "komik2browse",
        command: ["komik2browse", "komik2jelajah"],
        desc: "Jelajah komik (sumber 2)",
        async run(ctx) {
            const json = await api("browse", {}, "komik")
            await showList(ctx, json, "Komik Jelajah (sumber 2)", `🔎 Buka detail: *${ctx.prefix}komikdetail <nomor>*`, 25, "komik")
        }
    },
    {
        name: "komik2cari",
        command: ["komik2cari", "komik2search"],
        desc: "Cari komik (sumber 2)",
        usage: "<judul>",
        example: "solo leveling",
        needs: "text",
        async run(ctx) {
            const json = await api("search", { q: ctx.text }, "komik")
            await showList(ctx, json, `Hasil "${clip(ctx.text, 30)}" (sumber 2)`, `🔎 Buka detail: *${ctx.prefix}komikdetail <nomor>*`, 25, "komik")
        }
    },
    {
        name: "komikdebug",
        command: ["komikdebug"],
        ownerOnly: true,
        desc: "Lihat respons mentah API (owner)",
        usage: "<endpoint> [param=nilai ...]  (sumber 2: komik/<endpoint>)",
        example: "detail slug=one-piece  /  komik/home",
        async run(ctx) {
            let [ep, ...rest] = ctx.args
            if (!ep) throw new Usage()
            let section = SECTION
            if (ep.includes("/")) { [section, ep] = ep.split("/") }   // contoh: komik/home
            const params = {}
            for (const kv of rest) { const [k, ...v] = kv.split("="); if (k && v.length) params[k] = v.join("=") }
            const json = await api(ep, params, section)
            await ctx.m.reply(clip(JSON.stringify(json, null, 1), 3500))
        }
    }
]

const loader = createLoader({ label: "Komiku", items: FITUR, failText: "Fitur Komiku gagal" })
loader._t = { sectionsOf, normDetail, pageUrls, chapterList, buildPdf, jpegInfo, toJpegPage, newestFirst, chapNum, slugFrom }
module.exports = loader
