/*
  Download — kategori "Download" (play, tiktok, play2).

  .play dan .tiktok masih berupa case di fuyuha.js (hanya tampil di menu kategori ini).
  Plugin tambahan ada di folder /plugins/download (format ESM, gaya `handler.command = [...]`, contoh: play2.js).
  Fitur download berbasis API (aio, instagram, facebook, ytmp3, ytmp4, spotify, terabox, dst) ada di /plugins/download/api:
  satu fitur satu file CommonJS, helper & nama parameter API di _lib.js (file berawalan "_" = diabaikan).
  Mau tambah fitur download baru? Taruh file .js di folder /plugins/download (nama file diawali "_" = diabaikan),
  tambahkan nama commandnya di source/MenuData.js, dan kalau fiturnya makan limit tambahkan juga di
  LIMITED di source/Limit.js.
  Fitur berlimit otomatis kena limit & notifikasi sisa limit (dipotong di fuyuha.js sebelum plugin jalan).
*/
const fs = require("fs")
const path = require("path")
const { pathToFileURL } = require("url")

const { createLoader } = require("./PluginLoader.js")

const DIR = path.join(__dirname, "..", "plugins", "download")
// Fitur download berbasis API (satu fitur satu file CommonJS) ada di plugins/download/api
const apiLoader = createLoader({ label: "Download API", dir: path.join(DIR, "api"), failText: "Download gagal" })
const byCmd = new Map()
const plugins = []

let loading = null
function load() {
    if (loading) return loading
    loading = (async () => {
        let files = []
        try { files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js") && !f.startsWith("_")).sort() } catch (e) {
            console.log("[Download] folder plugins/download tidak ditemukan:", DIR)
            return
        }
        for (const f of files) {
            try {
                const mod = await import(pathToFileURL(path.join(DIR, f)).href)
                const fn = mod.default
                if (typeof fn !== "function") { console.log(`[Download] ${f}: bentuk plugin tidak dikenali, dilewati`); continue }
                const names = [].concat(fn.command || []).filter(Boolean).map((x) => String(x).toLowerCase())
                if (!names.length) { console.log(`[Download] ${f}: tidak ada command, dilewati`); continue }
                const p = { name: names[0], cmds: names, fn, file: f, ownerOnly: !!(fn.owner || fn.rowner) }
                plugins.push(p)
                for (const n of names) if (!byCmd.has(n)) byCmd.set(n, p)
            } catch (e) { console.log(`[Download] gagal memuat ${f}:`, e.message) }
        }
        console.log(`[Download] ${plugins.length} plugin download dimuat`)
    })()
    return loading
}

// plugin play2 mengirim pesan AI Rich (botForwardedMessage): library baileys harus mengenalnya
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

function wrap(sock, m, text, command) {
    const w = Object.assign(Object.create(Object.getPrototypeOf(m)), m)
    w.text = text
    w.command = command
    w.args = text ? text.split(/\s+/) : []
    w.name = m.pushName
    w.react = (emoji) => sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})
    return w
}

async function handle({ sock, m, command, args, isOwner }) {
    await load()
    const p = byCmd.get(command)
    if (!p) return apiLoader.handle({ sock, m, command, args, isOwner })   // bukan plugin ESM -> coba fitur API
    if (p.ownerOnly && !isOwner) { await m.reply(global.mess?.owner || "Fitur ini hanya untuk ownerbot."); return true }
    if (!richSupported()) {
        await m.reply("⚠️ Fitur ini butuh library baileys yang mendukung pesan *AI Rich* (botForwardedMessage).\nLibrary bot ini belum mendukung, update `baileys` ke versi terbaru dulu.")
        return true
    }
    const text = args.join(" ")
    const mm = wrap(sock, m, text, command)
    try {
        await p.fn(mm, { sock, conn: sock, client: sock, args, text, command, usedPrefix: m.prefix || ".", prefix: m.prefix || ".", isOwner })
    } catch (e) {
        // plugin gaya lama melempar string untuk pesan "cara pakai"
        if (typeof e === "string") { try { await m.reply(e) } catch (_) {} return true }
        console.log(`[Download] ${p.name} error:`, e)
        try { await m.reply(`❌ Fitur gagal dijalankan: ${e.message || e}`) } catch (_) {}
    }
    return true
}

module.exports = {
    load, handle,
    commands: () => [...byCmd.keys(), ...apiLoader.commands()],
    list: () => [...plugins.map((p) => ({ name: p.name, cmds: p.cmds })), ...apiLoader.list()]
}
