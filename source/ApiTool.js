/*
  Mesin bersama fitur API (kategori Tools & Stalker). Tiap kategori punya plugins/<kategori>/_lib.js tipis
  yang memanggil createKit("<bagian API>") supaya endpoint-nya benar (/tools/..., /stalker/...).

  tool({ name, command, endpoint, desc, usage, example, needs, params, output, timeout })
    - params(ctx) -> objek parameter query API (boleh async). `throw new Usage()` kalau input kurang.
    - output: "text" (default) | "image" | "video" | "audio" | "document" | "auto" (tebak dari ekstensi link hasil)
    - timeout: batas tunggu API (ms)
  Hasil API: kalau berupa file langsung -> dikirim sesuai jenisnya; kalau JSON -> link media diambil
  (untuk output media) atau isi JSON dirapikan jadi teks.

  Preset params: one, urlArg, number, pipe, urlPlus, mediaLink (+ linkAndRest untuk yang butuh sisa teks).
*/
const axios = require("axios")
const Kit = require("./ApiKit.js")
const { Usage } = require("./PluginLoader.js")

const HTTP = /^https?:\/\/\S+$/i

const apiUrl = (endpoint, params = {}, section = "tools") => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v))
    return `${Kit.ROOT}/${section}/${endpoint}?${q.toString()}`
}

/* ---------- panggil API ---------- */
async function call(endpoint, params, timeout = 90000, section = "tools") {
    const res = await axios.get(apiUrl(endpoint, params, section), {
        responseType: "arraybuffer",
        timeout,
        validateStatus: () => true,
        maxContentLength: 100 * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0" }
    })
    const type = String(res.headers["content-type"] || "").split(";")[0].toLowerCase()
    const buffer = Buffer.from(res.data)

    let json = null
    if (!type || /json|text\//.test(type)) { try { json = JSON.parse(buffer.toString("utf8")) } catch (_) {} }
    if (json) {
        const failed = res.status >= 400 || json.status === false || json.success === false || json.ok === false
        if (failed) throw new Error(String(json.message || json.error || json.msg || `API membalas ${res.status}`).slice(0, 300))
        return { json }
    }
    if (res.status >= 400 || !buffer.length) throw new Error(`API error (${res.status}), coba lagi nanti`)
    if (/text\//.test(type)) return { json: { result: buffer.toString("utf8") } }
    return { buffer, type }
}

/* ---------- baca hasil ---------- */
const URL_KEYS = ["url", "download", "downloadUrl", "download_url", "video", "image", "audio", "file", "link", "result", "output", "apk", "zip", "mp3", "mp4"]
function findUrl(v, d = 0) {
    if (typeof v === "string") return HTTP.test(v.trim()) ? v.trim() : null
    if (!v || typeof v !== "object" || d > 2) return null
    if (Array.isArray(v)) { for (const x of v) { const u = findUrl(x, d + 1); if (u) return u } return null }
    for (const k of URL_KEYS) if (k in v) { const u = findUrl(v[k], d + 1); if (u) return u }
    return null
}
const PIC_KEYS = ["avatar", "avatar_url", "avatarUrl", "profilePic", "profile_pic_url", "profilePicture", "profile_picture", "profile_pic", "pp", "picture", "photo", "thumbnail", "image", "icon", "logo"]
function findPic(v, d = 0) {
    if (!v || typeof v !== "object" || d > 2) return null
    for (const k of PIC_KEYS) if (typeof v[k] === "string" && HTTP.test(v[k].trim())) return v[k].trim()
    for (const x of Array.isArray(v) ? v : Object.values(v)) { const u = findPic(x, d + 1); if (u) return u }
    return null
}
const kindByUrl = (u) => {
    const p = u.split("?")[0].toLowerCase()
    if (/\.(jpe?g|png|webp|gif)$/.test(p)) return "image"
    if (/\.(mp4|webm|mov|mkv)$/.test(p)) return "video"
    if (/\.(mp3|wav|ogg|m4a|opus)$/.test(p)) return "audio"
    return "document"
}
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "application/pdf": "pdf", "application/zip": "zip", "application/vnd.android.package-archive": "apk" }

function fmt(v, ind = 0) {
    const pad = "  ".repeat(ind)
    if (v === null || v === undefined) return ""
    if (typeof v !== "object") return String(v)
    if (Array.isArray(v)) return v.map((x, i) => (x && typeof x === "object" ? `${pad}${i + 1}.\n${fmt(x, ind + 1)}` : `${pad}${i + 1}. ${x}`)).join("\n")
    return Object.entries(v)
        .filter(([, x]) => x !== null && x !== undefined && x !== "")
        .map(([k, x]) => (x && typeof x === "object" ? `${pad}*${k}*:\n${fmt(x, ind + 1)}` : `${pad}*${k}*: ${x}`))
        .join("\n")
}
function textOf(json) {
    let payload = json.result ?? json.data
    if (payload === undefined) { const { status, success, creator, author, ok, ...rest } = json; payload = rest }
    const t = typeof payload === "string" ? payload : fmt(payload)
    return (t || "✅ Selesai").slice(0, 3500)
}

/* ---------- kirim hasil ---------- */
async function sendMedia(sock, m, { kind, src, caption, fileName, mimetype }) {
    const q = { quoted: m }
    if (kind === "image") return sock.sendMessage(m.chat, { image: src, caption }, q)
    if (kind === "video") return sock.sendMessage(m.chat, { video: src, caption, mimetype: "video/mp4" }, q)
    if (kind === "audio") return sock.sendMessage(m.chat, { audio: src, mimetype: "audio/mpeg" }, q)
    return sock.sendMessage(m.chat, { document: src, caption, fileName, mimetype: mimetype || "application/octet-stream" }, q)
}

async function deliver(sock, m, def, res) {
    if (res.buffer) {                                   // API membalas file langsung
        const kind = /^image\//.test(res.type) ? "image" : /^video\//.test(res.type) ? "video" : /^audio\//.test(res.type) ? "audio" : "document"
        return sendMedia(sock, m, { kind, src: res.buffer, caption: "✅ Selesai", fileName: `${def.name}.${EXT[res.type] || "bin"}`, mimetype: res.type })
    }
    const out = def.output || "text"
    if (out === "profile") {                            // foto profil + data profil
        const payload = res.json.result ?? res.json.data ?? res.json
        const pic = findPic(payload)
        let text = textOf(res.json)
        if (pic) {
            text = text.split("\n").filter((l) => !l.includes(pic)).join("\n") || "✅ Selesai"   // link foto tidak perlu tampil di caption
            try {
                if (text.length <= 1000) return await sock.sendMessage(m.chat, { image: { url: pic }, caption: text }, { quoted: m })
                await sock.sendMessage(m.chat, { image: { url: pic } }, { quoted: m })
            } catch (_) { /* foto gagal diambil, kirim teks saja */ }
        }
        return m.reply(text)
    }
    if (out !== "text") {
        const payload = res.json.result ?? res.json.data ?? res.json
        const url = findUrl(payload) || findUrl(res.json)
        if (url) {
            const kind = out === "auto" ? kindByUrl(url) : out
            const title = payload && typeof payload === "object" && typeof payload.title === "string" ? `*${payload.title}*` : "✅ Selesai"
            const fileName = decodeURIComponent(url.split("?")[0].split("/").pop() || "") || `${def.name}.bin`
            return sendMedia(sock, m, { kind, src: { url }, caption: title, fileName })
        }
    }
    return m.reply(textOf(res.json))
}

function tool(def) {
    const { params, ...rest } = def
    return {
        ...rest,
        async run(ctx) {
            const p = params ? await params(ctx) : {}
            const res = await call(def.endpoint, p, def.timeout, def.section)
            await deliver(ctx.sock, ctx.m, def, res)
        }
    }
}

/* ---------- preset parameter ---------- */
const one = (name) => ({ text }) => ({ [name]: text })

const urlArg = (name = "url") => ({ text }) => {
    const u = text.split(/\s+/).find((a) => HTTP.test(a))
    if (!u) throw new Usage()
    return { [name]: u }
}

const number = (name = "number") => ({ text }) => {
    const n = text.replace(/\D/g, "")
    if (n.length < 6) throw new Usage()
    return { [name]: n }
}

// "a|b|c" -> { names[0]: a, ... }; defaults boleh nilai atau fungsi(out, parts)
const pipe = (names, { min = names.length, sep = /\s*\|\s*/, defaults = {} } = {}) => ({ text }) => {
    const parts = text.split(sep).map((s) => s.trim()).filter(Boolean)
    if (parts.length < min) throw new Usage()
    const out = {}
    names.forEach((n, i) => {
        const d = defaults[n]
        out[n] = parts[i] !== undefined ? parts[i] : typeof d === "function" ? d(out, parts) : d
    })
    return out
}

// link web + 1 opsi tambahan: .rateweb https://x.com mobile
const urlPlus = (extra, def, valid) => ({ text }) => {
    const args = text.split(/\s+/)
    const u = args.find((a) => HTTP.test(a))
    if (!u) throw new Usage()
    const e = args.find((a) => a !== u && (!valid || valid.includes(a.toLowerCase())))
    return { url: u, [extra]: e ? (valid ? e.toLowerCase() : e) : def }
}

// link media: ambil dari argumen pertama (kalau link) atau dari media yang dikirim/di-reply (otomatis di-upload)
async function linkAndRest({ m, args, text }, kind) {
    if (HTTP.test(args[0] || "")) return { link: args[0], rest: args.slice(1).join(" ").trim() }
    const buf = await Kit.getMedia(m, kind)
    if (!buf) throw new Usage()
    return { link: await Kit.uploadMedia(buf), rest: text.trim() }
}
const mediaLink = (kind, name = "url") => async (ctx) => ({ [name]: (await linkAndRest(ctx, kind)).link })

// username/ID akun: ambil kata pertama, buang "@"
const account = (name = "username") => ({ text }) => {
    const v = text.trim().split(/\s+/)[0].replace(/^@/, "")
    if (!v) throw new Usage()
    return { [name]: v }
}

const createKit = (section) => ({
    tool: (def) => tool({ section, ...def }),
    call, deliver, HTTP, Usage, one, urlArg, number, pipe, urlPlus, linkAndRest, mediaLink, account,
    apiUrl: (endpoint, params) => apiUrl(endpoint, params, section)
})

module.exports = { createKit, tool, call, deliver, apiUrl, HTTP, Usage, fmt, textOf, findUrl, kindByUrl, sendMedia, EXT }
