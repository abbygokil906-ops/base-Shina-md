/*
  Helper fitur Download berbasis API (file ini tidak dimuat sebagai fitur karena diawali "_").
  Endpoint otomatis /download/<endpoint> di ROOT API (source/ApiKit.js).

  PARAM = nama parameter query tiap jenis input. Kalau API ternyata memakai nama lain
  (mis. "link" bukan "url"), cukup ganti di sini, semua fitur ikut berubah.

  Hasil API dibaca otomatis (bentuk JSON-nya tidak perlu diketahui dulu):
    - daftar kualitas (ytmp4, youtube-dl, dll) -> dipilih satu (default <= 720p, atau sesuai angka di command)
    - banyak foto (slide TikTok, post IG)      -> dikirim sebagai foto (maks 10)
    - video / audio / file                     -> dikirim sesuai jenisnya (facebook & tiktok: video + audio)
    - tidak ada link media                     -> isi JSON dirapikan jadi teks
  Kalau file gagal dikirim (kebesaran dll) bot membalas link langsungnya.
*/
const kit = require("../../../source/ApiTool.js")
const base = kit.createKit("download")
const { HTTP, Usage } = kit

const PARAM = { url: "url", query: "query", format: "format" }

/* ---------- baca hasil ---------- */
const THUMB = /thumb|cover|poster|avatar|icon|logo|preview|profile|^pp$/i
const QKEYS = ["quality", "resolution", "label", "qualityLabel", "height", "bitrate", "format"]

const extKind = (u) => {
    const p = u.split("?")[0].toLowerCase()
    if (/\.(jpe?g|png|webp|gif)$/.test(p)) return "image"
    if (/\.(mp4|webm|mov|mkv|m3u8)$/.test(p)) return "video"
    if (/\.(mp3|wav|ogg|m4a|opus|aac)$/.test(p)) return "audio"
    if (/\.(zip|rar|7z|apk|pdf|epub|xapk|docx?|xlsx?|pptx?|txt)$/.test(p)) return "document"
    return null
}

function walk(v, key, out, d = 0) {
    if (typeof v === "string") { if (HTTP.test(v.trim())) out.push({ key, url: v.trim() }); return }
    if (!v || typeof v !== "object" || d > 4) return
    if (Array.isArray(v)) { for (const x of v) walk(x, key, out, d + 1); return }
    for (const [k, x] of Object.entries(v)) walk(x, k, out, d + 1)
}

function kindOf(e, fallback) {
    const byExt = extKind(e.url)
    if (byExt) return byExt
    if (/mp3|audio|music|sound/i.test(e.key)) return "audio"
    if (/mp4|video|nowm|watermark|stream|^hd$|^sd$|play/i.test(e.key)) return "video"
    if (/image|photo|img|pic|slide/i.test(e.key)) return "image"
    return fallback
}

function findQualityList(v, d = 0) {
    if (!v || typeof v !== "object" || d > 3) return null
    if (Array.isArray(v)) {
        const objs = v.filter((x) => x && typeof x === "object" && !Array.isArray(x))
        if (objs.length >= 2 && objs.filter((o) => kit.findUrl(o)).length >= 2 && objs.some((o) => QKEYS.some((k) => k in o))) return objs
        for (const x of v) { const r = findQualityList(x, d + 1); if (r) return r }
        return null
    }
    for (const x of Object.values(v)) { const r = findQualityList(x, d + 1); if (r) return r }
    return null
}

const qNum = (o) => {
    for (const k of QKEYS) {
        const m = String(o[k] ?? "").match(/\d{3,4}/)
        if (m) return Number(m[0])
    }
    return 0
}

function pickQuality(list, want, kind) {
    const items = list.map((o) => ({ o, n: qNum(o), url: kit.findUrl(o) })).filter((x) => x.url)
    if (!items.length) return null
    if (want) { const hit = items.find((x) => x.n === want); if (hit) return hit }
    const sorted = [...items].sort((a, b) => b.n - a.n)
    if (kind === "audio") return sorted[0]
    return sorted.find((x) => x.n && x.n <= 720) || sorted[sorted.length - 1]
}

function infoText(p, extra = "") {
    if (!p || typeof p !== "object" || Array.isArray(p)) return extra || "Selesai"
    const g = (...ks) => { for (const k of ks) { const v = p[k]; if (v !== undefined && v !== null && typeof v !== "object" && String(v).trim()) return String(v).trim() } }
    const who = g("author", "username", "nickname", "artist", "artists", "channel", "uploader") ||
        (p.author && typeof p.author === "object" ? p.author.nickname || p.author.name || p.author.username : undefined)
    const lines = []
    const title = g("title", "caption", "name", "filename", "fileName", "judul")
    if (title) lines.push(`*${title.slice(0, 300)}*`)
    if (who) lines.push(`${who}`)
    const album = g("album"); if (album) lines.push(`${album}`)
    const dur = g("duration", "durasi"); if (dur) lines.push(`⏱️ ${dur}`)
    const size = g("size", "filesize", "fileSize", "ukuran"); if (size) lines.push(`${size}`)
    if (extra) lines.push(extra)
    return lines.join("\n") || "Selesai"
}

/* ---------- kirim hasil ---------- */
async function safeSend(ctx, kind, url, caption, name) {
    try {
        await kit.sendMedia(ctx.sock, ctx.m, { kind, src: { url }, caption, fileName: name || decodeURIComponent(url.split("?")[0].split("/").pop() || "") || "file" })
        return true
    } catch (e) {
        console.log("[Download] gagal kirim media:", e?.message || e)
        await ctx.m.reply(`⚠️ File tidak bisa dikirim langsung (mungkin kebesaran).\nAmbil lewat link ini:\n${url}`).catch(() => {})
        return false
    }
}

async function deliver(ctx, def, json) {
    const payload = json.result ?? json.data ?? json
    const want = Number((ctx.args || []).find((a) => /^\d{3,4}p?$/i.test(a))?.replace(/p$/i, "")) || 0
    const fallbackKind = def.output && def.output !== "text" && def.output !== "auto" ? def.output : "document"

    // 1) daftar kualitas -> pilih satu
    const list = findQualityList(payload)
    if (list && (def.output === "video" || def.output === "audio")) {
        const pick = pickQuality(list, want, def.output)
        if (pick) {
            const root = Array.isArray(payload) ? {} : payload
            const cap = infoText(root, pick.n ? `${pick.n}${def.output === "audio" ? "kbps" : "p"}` : "")
            await safeSend(ctx, def.output, pick.url, cap, `${def.name}.${def.output === "audio" ? "mp3" : "mp4"}`)
            return
        }
    }

    // 2) kumpulkan media
    const all = []
    walk(payload, "", all)
    const seen = new Set()
    const media = all.filter((e) => !THUMB.test(e.key) && !seen.has(e.url) && seen.add(e.url))
    const groups = { image: [], video: [], audio: [], document: [] }
    for (const e of media) groups[kindOf(e, fallbackKind)].push(e)

    const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {}
    const cap = infoText(root)
    let sent = 0

    if (def.output === "document") {
        const f = groups.document[0] || groups.video[0] || groups.audio[0] || groups.image[0]
        if (f) { await safeSend(ctx, "document", f.url, cap); sent++ }
    } else {
        const prefer = (arr) => arr.find((e) => /nowm|no.?wm|hd/i.test(e.key)) || arr[0]
        let first = true
        if (groups.video.length) {
            await safeSend(ctx, "video", prefer(groups.video).url, cap, `${def.name}.mp4`); sent++; first = false
        } else if (groups.image.length) {
            const imgs = groups.image.slice(0, 10)
            for (let i = 0; i < imgs.length; i++) { await safeSend(ctx, "image", imgs[i].url, i === 0 ? cap : ""); sent++ }
            first = false
        }
        if (groups.audio.length) {
            if (first && cap !== "Selesai") await ctx.m.reply(cap).catch(() => {})   // audio tidak punya caption -> info lagu dikirim sebagai teks
            await safeSend(ctx, "audio", groups.audio[0].url, "", `${def.name}.mp3`); sent++
        }
        else if (first && groups.document.length) { await safeSend(ctx, "document", groups.document[0].url, cap); sent++ }
    }

    if (!sent) await ctx.m.reply(kit.textOf(json))
}

function tool(def) {
    const { params, ...rest } = def
    return {
        ...rest,
        async run(ctx) {
            const p = params ? await params(ctx) : {}
            const res = await base.call(def.endpoint, p, def.timeout || 120000, "download")
            if (res.buffer) return base.deliver(ctx.sock, ctx.m, def, res)   // API membalas file langsung
            await deliver(ctx, def, res.json)
        }
    }
}

/* ---------- preset parameter ---------- */
const urlOnly = (check) => ({ text }) => {
    const u = text.split(/\s+/).find((a) => HTTP.test(a) && (!check || check.test(a)))
    if (!u) throw new Usage()
    return { [PARAM.url]: u }
}
const queryOnly = () => ({ text }) => {
    if (!text.trim()) throw new Usage()
    return { [PARAM.query]: text.trim(), q: text.trim() }
}

module.exports = { tool, urlOnly, queryOnly, PARAM, Usage, HTTP }
