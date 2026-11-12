/*
  Helper fitur Anime (file ini tidak dimuat sebagai fitur karena diawali "_").
  Endpoint otomatis /animein/<endpoint> di ROOT API (source/ApiKit.js).

  Input user:
    - teks / id utama  -> dikirim ke parameter di `main.names` (semua alias dikirim sekaligus)
    - key=value        -> diteruskan apa adanya ke API (untuk filter/halaman), contoh: page=2 genre=1 status=ongoing
    - angka di belakang id (mis. ".animeepisodes <id> 2") dibaca sebagai halaman
    - link Animein sebagai id: bagian terakhir link otomatis dipakai sebagai slug/id
  Hasil API (bentuk JSON-nya tidak perlu diketahui dulu) dirapikan jadi teks: daftar bernomor + id yang bisa
  dicopy ke command berikutnya, poster dikirim sebagai foto kalau ada. Teks panjang dipecah jadi beberapa pesan.

  PARAM.page = nama parameter halaman. Kalau API memakai nama lain, ganti di sini.
*/
const kit = require("../../source/ApiTool.js")
const base = kit.createKit("animein")
const { HTTP, Usage } = kit

const PARAM = { page: "page" }

const TITLE_KEYS = ["title", "judul", "name", "nama", "label", "anime", "episode_title"]
const ID_KEYS = ["slug", "id", "endpoint", "url", "link", "href"]
const EXTRA_KEYS = ["episode", "eps", "ep", "type", "status", "score", "rating", "day", "hari", "time", "jam", "year", "season", "date", "total_episode"]
const POSTER_KEYS = ["poster", "image", "thumbnail", "thumb", "cover", "banner", "img"]
const LONG = { synopsis: 700, sinopsis: 700, description: 700, deskripsi: 700, content: 400, comment: 400, text: 400 }

const scalar = (v) => v !== null && v !== undefined && typeof v !== "object" && String(v).trim() !== ""
const pick = (o, keys) => { for (const k of keys) if (scalar(o[k])) return String(o[k]).trim() }
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s)

function itemLine(o, i) {
    const title = pick(o, TITLE_KEYS)
    const id = pick(o, ID_KEYS)
    const extras = EXTRA_KEYS.filter((k) => scalar(o[k]) && o[k] !== title && String(o[k]) !== id).slice(0, 3).map((k) => `${k} ${o[k]}`)
    if (!title && !id) return null
    return `${i}. ${clip(title || id, 120)}${extras.length ? ` (${extras.join(", ")})` : ""}${title && id ? `\n    🔑 ${clip(id, 160)}` : ""}`
}

function render(v, depth = 0) {
    const pad = "  ".repeat(depth)
    if (scalar(v)) return String(v)
    if (Array.isArray(v)) {
        if (!v.length) return ""
        if (v.every(scalar)) return v.join(", ")
        const lines = []
        v.slice(0, 40).forEach((x, i) => {
            if (scalar(x)) return lines.push(`${i + 1}. ${x}`)
            const l = x && typeof x === "object" && !Array.isArray(x) ? itemLine(x, i + 1) : null
            lines.push(l || `${i + 1}.\n${render(x, depth + 1)}`)
        })
        if (v.length > 40) lines.push(`… +${v.length - 40} lainnya`)
        return lines.join("\n")
    }
    if (!v || typeof v !== "object") return ""
    return Object.entries(v)
        .filter(([k, x]) => !POSTER_KEYS.includes(k) && x !== null && x !== undefined && x !== "" && !(Array.isArray(x) && !x.length))
        .map(([k, x]) => {
            if (scalar(x)) return `${pad}*${k}*: ${LONG[k] ? clip(String(x), LONG[k]) : x}`
            return `${pad}*${k}*:\n${render(x, depth + 1)}`
        })
        .join("\n")
}

function poster(v, d = 0) {
    if (!v || typeof v !== "object" || d > 1 || Array.isArray(v)) return null
    for (const k of POSTER_KEYS) if (typeof v[k] === "string" && HTTP.test(v[k].trim())) return v[k].trim()
    for (const x of Object.values(v)) { const u = poster(x, d + 1); if (u) return u }
    return null
}

const chunks = (text, n = 3500) => {
    const out = []
    let cur = ""
    for (const line of text.split("\n")) {
        if ((cur + "\n" + line).length > n && cur) { out.push(cur); cur = line } else cur = cur ? cur + "\n" + line : line
    }
    if (cur) out.push(cur)
    return out
}

function buildParams({ text, args }, def) {
    const out = {}
    const rest = []
    for (const a of args) {
        const kv = a.match(/^([a-z_][a-z0-9_]*)=(.+)$/i)
        if (kv) out[kv[1]] = kv[2]
        else rest.push(a)
    }
    const main = def.main
    if (!main) return out
    let page
    let value
    if (main.type === "id") {
        if (rest.length > 1 && /^\d{1,3}$/.test(rest[rest.length - 1]) && main.paged) page = rest.pop()
        value = rest.join(" ").trim()
        if (value && HTTP.test(value)) {
            const slug = value.split("?")[0].replace(/\/+$/, "").split("/").pop()
            for (const n of main.names) out[n] = n === "url" || n === "link" ? value : slug
        } else if (value) for (const n of main.names) out[n] = value
    } else {
        value = rest.join(" ").trim()
        if (value) for (const n of main.names) out[n] = value
    }
    if (!value && !main.opt) throw new Usage()
    if (page && !out[PARAM.page]) out[PARAM.page] = page
    return out
}

function tool(def) {
    const { main, hint, ...rest } = def
    return {
        ...rest,
        async run(ctx) {
            const params = buildParams(ctx, def)
            const res = await base.call(def.endpoint, params, def.timeout || 90000, "animein")
            const payload = res.json?.result ?? res.json?.data ?? res.json
            const body = render(payload).trim() || "Tidak ada hasil."
            const text = `${def.title ? `*${def.title}*\n\n` : ""}${body}${hint ? `\n\n💡 ${hint}` : ""}`
            const pics = def.poster ? poster(payload) : null
            const parts = chunks(text)
            if (pics) {
                try {
                    if (parts[0].length <= 1000) { await ctx.sock.sendMessage(ctx.m.chat, { image: { url: pics }, caption: parts.shift() }, { quoted: ctx.m }) }
                    else await ctx.sock.sendMessage(ctx.m.chat, { image: { url: pics } }, { quoted: ctx.m })
                } catch (_) { /* poster gagal diambil, teks saja */ }
            }
            for (const p of parts.slice(0, 4)) await ctx.m.reply(p)
        }
    }
}

module.exports = { tool, Usage }
