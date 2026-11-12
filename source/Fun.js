/*
  Fun — kategori "Fun" Fuyuha Shina MD (cek-cekan, tanya bot, game seru, tebak-tebakan, ramalan, menfess, dst).

  Plugin ada di folder /plugins/fun (satu fitur = satu file, format ESM). Pembantu & penghubungnya ada di
  plugins/fun/_engine.js (nama file diawali "_" = bukan fitur, diabaikan loader).
  Mau tambah fitur? Taruh file .js di /plugins/fun, lalu tambahkan nama commandnya di source/MenuData.js (kategori Fun).

  Dipanggil dari fuyuha.js:
    handle({ sock, m, command, args, isOwner })   -> command fun (.cekiq, .tebak, .werewolf, ...)
    handleBefore({ sock, m, isOwner })            -> pesan biasa: jawaban game yang sedang jalan (tebak, cepatketik, hilo, dst)
*/
const fs = require("fs")
const path = require("path")
const { pathToFileURL } = require("url")
const { createLoader } = require("./PluginLoader.js")

const DIR = path.join(__dirname, "..", "plugins", "fun")
const byCmd = new Map()   // command / sub-command -> plugin
const plugins = []        // { name, cmds, subs, fn, file }
// fitur Fun gaya API (artinama, cekjodoh, pap, quotes*, dst): plugins/fun/lama, CommonJS, mesin PluginLoader
const lama = createLoader({ label: "Fun", dir: path.join(DIR, "lama"), failText: "Fitur gagal dijalankan" })
let engine = null
let loading = null

function load() {
    if (loading) return loading
    loading = (async () => {
        let files = []
        try { files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js") && !f.startsWith("_")).sort() } catch (e) {
            console.log("[Fun] folder plugins/fun tidak ditemukan:", DIR)
            return
        }
        lama.load()
        engine = await import(pathToFileURL(path.join(DIR, "_engine.js")).href)
        for (const f of files) {
            try {
                const mod = await import(pathToFileURL(path.join(DIR, f)).href)
                const fn = mod.default
                if (typeof fn !== "function") { console.log(`[Fun] ${f}: bentuk plugin tidak dikenali, dilewati`); continue }
                const main = [].concat(fn.command || []).map((x) => String(x).toLowerCase()).filter(Boolean)
                const subs = [].concat(fn.subs || []).map((x) => String(x).toLowerCase()).filter(Boolean)
                const p = { name: path.basename(f, ".js"), cmds: main, subs, fn, file: f }
                plugins.push(p)
                for (const n of [...main, ...subs]) if (!byCmd.has(n)) byCmd.set(n, p)
            } catch (e) { console.log(`[Fun] gagal memuat ${f}:`, e.message) }
        }
        console.log(`[Fun] ${plugins.length} fitur dimuat`)
    })()
    return loading
}

// salinan dangkal pesan + helper yang biasa dipakai plugin (m.react, m.replyImage, m.text, ...)
function wrap(sock, m, text, command, args) {
    const w = Object.assign(Object.create(Object.getPrototypeOf(m)), m)
    w.text = text
    w.command = command
    w.args = args
    w.name = m.pushName
    // plugin fun ditulis dengan reply gaya lama: m.reply(teks, null, { mentions }) / m.reply(teks, chat, opsi).
    // m.reply bawaan NihiluxMD = (teks, opsi) -> null di posisi kedua bikin error "reading 'chat'", jadi dijembatani di sini.
    w.reply = async (content, a, b) => {
        let chat = m.chat
        let opts = {}
        if (a && typeof a === "object") opts = a
        else {
            if (typeof a === "string" && a) chat = a
            if (b && typeof b === "object") opts = b
        }
        const { chat: c2, quoted, ...rest } = opts
        const q = { quoted: quoted || m }
        if (c2) chat = c2
        if (content && typeof content === "object") return sock.sendMessage(chat, { ...content, ...rest }, q)
        const text = String(content ?? "")
        const mentions = rest.mentions || [...text.matchAll(/@(\d{5,16})/g)].map((x) => x[1] + "@s.whatsapp.net")
        return sock.sendMessage(chat, { text, ...rest, mentions }, q)
    }
    w.react = (emoji) => sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})
    w.replyImage = (url, caption = "") => sock.sendMessage(m.chat, { image: { url }, caption }, { quoted: m })
    return w
}

function context(sock, m, { command, text, args, isOwner }) {
    const meta = m.metadata || {}
    return {
        sock, conn: sock, client: sock,
        command, cmd: command, text, args, budy: String(m.body || ""),
        prefix: m.prefix, usedPrefix: m.prefix,
        isOwner: !!isOwner, isCreator: !!isOwner, isPremium: !!isOwner,
        isGroup: !!m.isGroup, isAdmins: !!(m.isAdmin || isOwner), isBotAdmins: !!m.isBotAdmin,
        groupMetadata: meta, participants: meta.participants || [],
        pushname: m.pushName, pushName: m.pushName,
        reply: (t, ...r) => m.reply(t, ...r)
    }
}

// command fun (.cekiq, .tebak hitung, .cektampan @user, ...)
async function handle({ sock, m, command, args, isOwner }) {
    await load()
    const p = byCmd.get(command)
    if (!p) return lama.handle({ sock, m, command, args, isOwner })
    let cmd = command
    const rest = args.slice()
    // ".tebak petunjuk" / ".menfess balasmenfess ..." -> kata pertama yang cocok sub-command dijalankan sebagai command itu
    if (p.cmds.includes(cmd) && rest.length && p.subs.includes(String(rest[0]).toLowerCase())) cmd = String(rest.shift()).toLowerCase()
    if (p.fn.group && !m.isGroup) { await m.reply(global.mess?.group || "Fitur ini hanya bisa dipakai di dalam grup."); return true }
    const text = rest.join(" ")
    const mm = wrap(sock, m, text, cmd, rest)
    try {
        await p.fn(mm, context(sock, mm, { command: cmd, text, args: rest, isOwner }))
    } catch (e) {
        console.log(`[Fun] ${p.name} error:`, e)
        try { await m.reply(typeof e === "string" ? e : `❌ Fitur gagal dijalankan: ${e.message || e}`) } catch (_) {}
    }
    return true
}

// pesan biasa: jawaban untuk game fun yang sedang berjalan di chat ini
async function handleBefore({ sock, m, isOwner }) {
    if (m.fromMe) return false
    const body = String(m.body || "").trim()
    if (!body) return false
    await load()
    if (!engine) return false
    try {
        const args = body.split(/\s+/)
        const mm = wrap(sock, m, body, "", args)
        return !!(await engine.dioBefore(mm, context(sock, mm, { command: "", text: body, args, isOwner })))
    } catch (e) {
        console.log("[Fun] before error:", e)
        return false
    }
}

module.exports = { load, handleBefore, handle, list: () => plugins.map((p) => ({ name: p.name, cmds: p.cmds, subs: p.subs })), lamaCommands: () => lama.commands() }
