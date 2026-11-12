/*
  Info — kategori berita & info publik lewat API /info/* (Antara, Berita Jakarta, CNBC, CNN, Kompas, Sindonews,
  InfoPublik, Kemenag, Kemkes, gempa BMKG).
  SEMUA fitur kategori ini ada di SATU file ini (daftar BERITA di bawah) -> kalau mau update cukup timpa file ini.

  Cara pakai:  .cnn            -> 10 berita terbaru
               .cnn 5          -> 5 berita saja (angka = jumlah yang ditampilkan)
               .kemkes page=2  -> parameter API apa pun bisa dikirim dengan format nama=nilai
  (endpoint yang punya "parameter" di dokumentasi API menerima nama=nilai ini; kalau parameternya wajib dan belum
  diisi, balasan error dari API akan menyebut parameter apa yang kurang.)

  Tambah sumber baru: tambahkan satu entri di BERITA, lalu daftarkan command-nya di source/MenuData.js (kategori Info).
*/
const { createLoader, Usage } = require("./PluginLoader.js")
const { call, HTTP } = require("./ApiTool.js")

const SECTION = "info"
const DEFAULT_COUNT = 10

/* ---------- util ---------- */
const S = (v) => {
    if (v == null) return ""
    if (typeof v === "string" || typeof v === "number") return String(v).trim()
    if (Array.isArray(v)) return v.map(S).filter(Boolean).join(", ")
    if (typeof v === "object") return S(v.title ?? v.name ?? v.text ?? v.label ?? "")
    return ""
}
const first = (o, keys) => {
    if (!o || typeof o !== "object") return ""
    for (const k of keys) { const v = S(o[k]); if (v) return v }
    return ""
}
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + "…" : String(s))
const rootOf = (json) => (json && (json.result ?? json.data)) ?? json
const isObjArr = (a) => Array.isArray(a) && a.length > 0 && a.some((x) => x && typeof x === "object" && !Array.isArray(x))

function normNews(o) {
    if (!o || typeof o !== "object") return null
    const title = first(o, ["title", "judul", "headline", "name", "berita"])
    if (!title) return null
    return {
        title,
        link: first(o, ["link", "url", "href"]),
        date: first(o, ["date", "tanggal", "time", "pubDate", "published", "published_at", "waktu", "created_at"]),
        image: first(o, ["image", "thumbnail", "img", "gambar", "thumb", "cover", "foto", "poster"]),
        desc: first(o, ["description", "deskripsi", "desc", "summary", "ringkasan", "excerpt"]),
        views: first(o, ["dibaca", "views", "read", "viewers"]),
        duration: first(o, ["duration", "durasi"]),
        category: first(o, ["category", "kategori"])
    }
}

// cari daftar berita di respons (array langsung, atau array di dalam objek sampai 2 tingkat)
function newsItems(json) {
    const root = rootOf(json)
    const cands = []
    if (isObjArr(root)) cands.push(root)
    else if (root && typeof root === "object") {
        for (const v of Object.values(root)) {
            if (isObjArr(v)) cands.push(v)
            else if (v && typeof v === "object" && !Array.isArray(v)) for (const v2 of Object.values(v)) if (isObjArr(v2)) cands.push(v2)
        }
    }
    for (const arr of cands) {
        const items = arr.map(normNews).filter(Boolean)
        if (items.length) return items
    }
    return []
}

// "5" -> jumlah tampil, "nama=nilai" -> parameter API
function parseArgs(args) {
    const params = {}
    let count = DEFAULT_COUNT
    for (const a of args) {
        if (/^\d{1,2}$/.test(a) && count === DEFAULT_COUNT) count = Math.min(30, Math.max(1, +a))
        else if (a.includes("=")) { const [k, ...v] = a.split("="); if (k && v.length) params[k.trim()] = v.join("=").trim() }
    }
    return { params, count }
}

const api = async (endpoint, params) => {
    const r = await call(endpoint, params, 60000, SECTION)
    if (!r.json) throw new Error("Respons API tidak dikenali")
    return r.json
}

// objek apa pun -> baris "label : nilai" (untuk respons yang bukan daftar berita)
const LABEL = {
    waktu: "🕒 Waktu", tanggal: "📅 Tanggal", jam: "🕒 Jam", magnitudo: "📊 Magnitudo", magnitude: "📊 Magnitudo", kedalaman: "🌊 Kedalaman",
    wilayah: "📍 Wilayah", lokasi: "📍 Lokasi", koordinat: "🧭 Koordinat", lintang: "🧭 Lintang", bujur: "🧭 Bujur", potensi: "⚠️ Potensi", dirasakan: "📣 Dirasakan"
}
function flatLines(o, depth = 0) {
    if (!o || typeof o !== "object") return []
    const out = []
    for (const [k, v] of Object.entries(o)) {
        if (v == null || v === "") continue
        if (typeof v === "object") { if (depth < 1) out.push(...flatLines(v, depth + 1)); continue }
        const val = String(v).trim()
        if (HTTP.test(val)) continue
        out.push(`${LABEL[k.toLowerCase()] || `*${k.replace(/[_-]+/g, " ")}*`} : ${clip(val, 200)}`)
    }
    return out
}
function findImage(o, d = 0) {
    if (!o || typeof o !== "object" || d > 2) return ""
    const entries = Object.entries(o)
    for (const [k, v] of entries) if (typeof v === "string" && HTTP.test(v.trim()) && /shake|peta|map|image|gambar|thumb|foto|img/i.test(k)) return v.trim()
    for (const [, v] of entries) if (typeof v === "string" && HTTP.test(v.trim()) && /\.(jpe?g|png|webp)(\?|$)/i.test(v)) return v.trim()
    for (const [, v] of entries) { if (v && typeof v === "object") { const r = findImage(Array.isArray(v) ? v[0] : v, d + 1); if (r) return r } }
    return ""
}

/* ---------- tampilan ---------- */
async function showNews(ctx, def, json, count) {
    const { m } = ctx
    const items = newsItems(json)
    if (!items.length) {
        const root = rootOf(json)
        const lines = root && typeof root === "object" && !Array.isArray(root) ? flatLines(root) : []
        const body = lines.length ? lines.join("\n") : clip(JSON.stringify(root, null, 1) || "kosong", 1200)
        return m.reply(`${def.icon} *${def.title}*\n\n${body}`)
    }
    const show = items.slice(0, count)
    let text
    for (let n = show.length; n >= 1; n--) {
        const lines = show.slice(0, n).map((it, i) => {
            const meta = [it.date && `🕒 ${clip(it.date, 40)}`, it.duration && `⏱️ ${it.duration}`, it.views && `👁️ ${it.views}`].filter(Boolean).join("  ")
            return `${i + 1}. *${clip(it.title, 110)}*` + (meta ? `\n    ${meta}` : "") + (it.link ? `\n    🔗 ${it.link}` : "")
        })
        text = `${def.icon} *${def.title}*  (${n} dari ${items.length})\n\n${lines.join("\n\n")}`
        if (text.length <= 3800) break
    }
    // foto berita teratas sebagai cover kalau ada
    const cover = show[0] && show[0].image
    if (cover && HTTP.test(cover)) {
        try { await ctx.sock.sendMessage(m.chat, { image: { url: cover }, caption: `${def.icon} *${def.title}*\n${clip(show[0].title, 150)}` }, { quoted: m }) } catch (_) {}
    }
    await m.reply(text)
}

async function showGempa(ctx, def, json) {
    const { sock, m } = ctx
    const root = rootOf(json)
    let list = []
    if (isObjArr(root)) list = root
    else if (root && typeof root === "object") for (const v of Object.values(root)) if (isObjArr(v)) { list = v; break }
    const main = list.length ? list[0] : root
    const lines = flatLines(main)
    if (!lines.length) return m.reply(`${def.icon} *${def.title}*\n\n${clip(JSON.stringify(root, null, 1) || "kosong", 1200)}`)
    let text = `${def.icon} *${def.title}*\n\n${lines.join("\n")}`
    if (list.length > 1) {
        const more = list.slice(1, 5).map((g) => {
            const w = first(g, ["waktu", "tanggal", "time", "datetime"]), mg = first(g, ["magnitudo", "magnitude", "mag"]), r = first(g, ["wilayah", "lokasi", "region"])
            return `• ${[w, mg && `M${mg}`, r].filter(Boolean).join(" | ")}`
        }).filter((x) => x !== "• ")
        if (more.length) text += `\n\n*Gempa lainnya:*\n${more.join("\n")}`
    }
    const img = findImage(main) || findImage(root)
    if (img && text.length <= 1000) {
        try { return await sock.sendMessage(m.chat, { image: { url: img }, caption: text }, { quoted: m }) } catch (_) {}
    }
    if (img) { try { await sock.sendMessage(m.chat, { image: { url: img }, caption: `${def.icon} *${def.title}*` }, { quoted: m }) } catch (_) {} }
    await m.reply(clip(text, 3800))
}

/* ---------- daftar fitur ---------- */
const BERITA = [
    { name: "antara", command: ["antara", "antaranews"], endpoint: "antara", icon: "📰", title: "Antara News — Terbaru", desc: "Berita terbaru Antara News" },
    { name: "beritajakarta", command: ["beritajakarta", "bjakarta"], endpoint: "beritajakarta", icon: "🏙️", title: "Berita Jakarta — Terbaru", desc: "Berita terbaru Berita Jakarta" },
    { name: "cnbc", command: ["cnbc", "cnbcindonesia"], endpoint: "cnbc", icon: "💹", title: "CNBC Indonesia — Terbaru", desc: "Berita terbaru CNBC Indonesia" },
    { name: "cnn", command: ["cnn", "cnnindonesia"], endpoint: "cnn", icon: "📺", title: "CNN Indonesia — Terbaru", desc: "Berita terbaru CNN Indonesia" },
    { name: "kompas", command: ["kompas", "kompascom"], endpoint: "kompas", icon: "🧭", title: "Kompas — Terbaru", desc: "Berita terbaru Kompas" },
    { name: "sindonews", command: ["sindonews", "sindo"], endpoint: "sindonews", icon: "🗞️", title: "Sindonews — Terbaru", desc: "Berita terbaru Sindonews" },
    { name: "infopublik", command: ["infopublik"], endpoint: "infopublik", icon: "🏛️", title: "InfoPublik — Terbaru", desc: "Berita terbaru InfoPublik" },
    { name: "kemenag", command: ["kemenag", "kemenagshorts"], endpoint: "kemenag", icon: "🕌", title: "Kemenag RI — Video Shorts", desc: "Video shorts terbaru Kementerian Agama RI" },
    { name: "kemkes", command: ["kemkes", "kemenkes"], endpoint: "kemkes", icon: "🏥", title: "Kemenkes RI — Rilis Berita", desc: "Rilis berita Kementerian Kesehatan RI" }
]

const FITUR = [
    ...BERITA.map((def) => ({
        name: def.name,
        command: def.command,
        desc: def.desc,
        usage: "[jumlah] [nama=nilai]",
        example: "5",
        async run(ctx) {
            const { params, count } = parseArgs(ctx.args)
            await showNews(ctx, def, await api(def.endpoint, params), count)
        }
    })),
    {
        name: "gempa",
        command: ["gempa", "infogempa", "bmkg"],
        desc: "Info gempa bumi terbaru (BMKG)",
        usage: "[nama=nilai]",
        async run(ctx) {
            const { params } = parseArgs(ctx.args)
            await showGempa(ctx, { icon: "🌋", title: "Gempa Bumi Terbaru — BMKG" }, await api("bmkg-gempa", params))
        }
    },
    {
        name: "infodebug",
        command: ["infodebug"],
        ownerOnly: true,
        desc: "Lihat respons mentah API Info (owner)",
        usage: "<endpoint> [param=nilai ...]",
        example: "cnn",
        async run(ctx) {
            const [ep, ...rest] = ctx.args
            if (!ep) throw new Usage()
            const params = parseArgs(rest).params
            await ctx.m.reply(clip(JSON.stringify(await api(ep, params), null, 1), 3500))
        }
    }
]

const loader = createLoader({ label: "Info", items: FITUR, failText: "Gagal mengambil info" })
loader._t = { newsItems, flatLines, findImage, parseArgs }
module.exports = loader
