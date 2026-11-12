/*
  Game — kategori "Game" (game HTML AI Rich + game kuis) di Fuyuha Shina MD.

  Plugin game ada di folder /plugins/game (format ESM, asalnya dari bot lain). File di sana TIDAK perlu diubah:
  modul ini memuatnya otomatis, membungkus objek pesan (m.react, m.replyImage, dst) dan memetakan
  command + alias-nya. Mau tambah game baru? Taruh file .js di folder /plugins/game (nama file diawali "_" = diabaikan),
  lalu tambahkan nama commandnya di source/MenuData.js supaya tampil di menu.

  Game kuis (asahotak, benaratausalah, susunkata) bisa dijawab dengan reply pesan soal (atau ketik jawaban
  langsung di chat pribadi).
*/
const fs = require("fs")
const path = require("path")
const { pathToFileURL } = require("url")

const DIR = path.join(__dirname, "..", "plugins", "game")
const byCmd = new Map()   // command/alias -> plugin
const plugins = []        // { name, cmds, cfg, fn, mod }
// game kuis: bukan pesan HTML AI Rich, jadi tidak butuh dukungan khusus dari library
const PLAIN = new Set(["asahotak", "benaratausalah", "susunkata", "tebakbendera"])
// game yang jawabannya boleh lewat reply / chat biasa saat ada sesi aktif
const REPLY_GAMES = ["asahotak", "benaratausalah", "susunkata"]

let loading = null
function load() {
    if (loading) return loading
    loading = (async () => {
        let files = []
        try { files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js") && !f.startsWith("_")).sort() } catch (e) {
            console.log("[Game] folder plugins/game tidak ditemukan:", DIR)
            return
        }
        for (const f of files) {
            try {
                const mod = await import(pathToFileURL(path.join(DIR, f)).href)
                const d = mod.default
                let cfg, fn, names
                if (typeof d === "function") {
                    fn = d
                    names = [].concat(d.command || [])
                    cfg = { isEnabled: true, isOwner: false }
                } else if (d && typeof d.handler === "function") {
                    fn = d.handler
                    cfg = d.config || mod.config || {}
                    names = [cfg.name, ...(cfg.alias || [])]
                } else { console.log(`[Game] ${f}: bentuk plugin tidak dikenali, dilewati`); continue }
                if (cfg.isEnabled === false) continue
                names = names.filter(Boolean).map((x) => String(x).toLowerCase())
                if (!names.length) { console.log(`[Game] ${f}: tidak ada nama command, dilewati`); continue }
                const p = { name: names[0], cmds: names, cfg, fn, mod, file: f }
                plugins.push(p)
                for (const n of names) if (!byCmd.has(n)) byCmd.set(n, p)
            } catch (e) { console.log(`[Game] gagal memuat ${f}:`, e.message) }
        }
        console.log(`[Game] ${plugins.length} game dimuat`)
    })()
    return loading
}

// library baileys harus mengenal pesan botForwardedMessage (AI Rich); kalau tidak, game HTML terkirim kosong
let richOk
function richSupported() {
    if (richOk !== undefined) return richOk
    try {
        const { proto } = require("baileys")
        if (!proto || !proto.Message || !proto.Message.fromObject) return (richOk = true)
        const t = proto.Message.fromObject({ botForwardedMessage: { message: { richResponseMessage: { messageType: 1 } } } })
        richOk = !!t.botForwardedMessage
    } catch (e) { richOk = true }
    return richOk
}

// bungkus pesan supaya cocok dengan yang diharapkan plugin
function wrap(sock, m, text, command) {
    const w = Object.create(m)
    w.text = text
    w.command = command
    w.args = text ? text.split(/\s+/) : []
    w.name = m.pushName
    w.react = (emoji) => sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})
    w.replyImage = (url, caption = "") => sock.sendMessage(m.chat, { image: { url }, caption }, { quoted: m })
    return w
}

async function run(plugin, { sock, m, command, text, args, isOwner }) {
    if (!PLAIN.has(plugin.name) && !richSupported()) {
        await m.reply("⚠️ Game HTML butuh library baileys yang mendukung pesan *AI Rich* (botForwardedMessage).\nLibrary bot ini belum mendukung, update `baileys` ke versi terbaru dulu.")
        return
    }
    const mm = wrap(sock, m, text, command)
    try {
        await plugin.fn(mm, { sock, conn: sock, client: sock, args, text, command, cmd: command, usedPrefix: m.prefix, prefix: m.prefix, isOwner })
    } catch (e) {
        console.log(`[Game] ${plugin.name} error:`, e)
        try { await m.reply(`❌ Game gagal dijalankan: ${e.message || e}`) } catch (_) {}
    }
}

// command game (.tetris, .slot, .catur, ...)
async function handle({ sock, m, command, args, isOwner }) {
    await load()
    const p = byCmd.get(command)
    if (!p) return false
    if (p.cfg.isOwner && !isOwner) { await m.reply(global.mess?.owner || "Fitur ini hanya untuk ownerbot."); return true }
    await run(p, { sock, m, command, text: args.join(" "), args, isOwner })
    return true
}

// jawaban game kuis lewat reply (grup) atau chat biasa (pribadi) selama ada sesi aktif
async function handleReply({ sock, m, isOwner }) {
    if (m.fromMe) return false
    const body = String(m.body || "").trim()
    if (!body) return false
    if (m.isGroup && !m.quoted) return false
    await load()
    for (const name of REPLY_GAMES) {
        const p = plugins.find((x) => x.name === name)
        if (p && typeof p.mod.hasSession === "function" && p.mod.hasSession(m.chat)) {
            await run(p, { sock, m, command: p.name, text: body, args: body.split(/\s+/), isOwner })
            return true
        }
    }
    return false
}

module.exports = { load, handle, handleReply, list: () => plugins.map((p) => ({ name: p.name, cmds: p.cmds })) }
