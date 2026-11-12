/*
  Pemuat plugin fitur (dipakai kategori Stiker & Tools).
  createLoader({ label, dir }) -> { load, handle, commands, list }

  Satu fitur = satu file .js di folder `dir` (nama file diawali "_" = diabaikan). Bentuk plugin (CommonJS):
    {
      name, command: ["nama", "alias"], desc, usage, example,
      needs: "text",      // opsional: wajib ada teks (atau reply teks), kalau kosong otomatis dibalas cara pakai
      ownerOnly: false,   // opsional
      async run({ sock, m, args, text, command, prefix, isOwner }) { ... }
    }
  Di dalam run, `throw new Usage()` = balas cara pakai (dari usage + example), `throw new Usage("pesan")` = balas pesan itu.
  Error lain otomatis dibalas "❌ Gagal ..." dan bot tidak crash.
*/
const fs = require("fs")
const path = require("path")

class Usage extends Error {
    constructor(msg) { super(msg || ""); this.isUsage = true }
}

function createLoader({ label, dir, items, failText = "Fitur gagal dijalankan" }) {
    const byCmd = new Map()
    const plugins = []
    let loaded = false

    function load() {
        if (loaded) return
        loaded = true
        if (Array.isArray(items)) {   // mode satu file: semua fitur didefinisikan di array `items`
            for (const p of items) {
                const names = [].concat(p.command || []).filter(Boolean).map((x) => String(x).toLowerCase())
                if (typeof p.run !== "function" || !names.length) { console.log(`[${label}] ${p.name}: bentuk plugin tidak dikenali, dilewati`); continue }
                const item = { ...p, name: p.name || names[0], cmds: names, file: "(satu file)" }
                plugins.push(item)
                for (const n of names) if (!byCmd.has(n)) byCmd.set(n, item)
            }
            console.log(`[${label}] ${plugins.length} fitur dimuat`)
            return
        }
        let files = []
        try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".js") && !f.startsWith("_")).sort() } catch (e) {
            console.log(`[${label}] folder tidak ditemukan:`, dir)
            return
        }
        for (const f of files) {
            try {
                const p = require(path.join(dir, f))
                const names = [].concat(p.command || []).filter(Boolean).map((x) => String(x).toLowerCase())
                if (typeof p.run !== "function" || !names.length) { console.log(`[${label}] ${f}: bentuk plugin tidak dikenali, dilewati`); continue }
                const item = { ...p, name: p.name || names[0], cmds: names, file: f }
                plugins.push(item)
                for (const n of names) if (!byCmd.has(n)) byCmd.set(n, item)
            } catch (e) { console.log(`[${label}] gagal memuat ${f}:`, e.message) }
        }
        console.log(`[${label}] ${plugins.length} fitur dimuat`)
    }

    const usageText = (p, prefix, command) =>
        `*Cara pakai:*\n${prefix}${command}${p.usage ? " " + p.usage : ""}${p.example ? `\n\n*Contoh:*\n${prefix}${command} ${p.example}` : ""}`

    async function handle({ sock, m, command, args, isOwner }) {
        load()
        const p = byCmd.get(command)
        if (!p) return false
        if (p.ownerOnly && !isOwner) { await m.reply(global.mess?.owner || "Fitur ini hanya untuk ownerbot."); return true }

        const prefix = m.prefix || "."
        let text = args.join(" ").trim()
        if (!text && p.needs === "text") text = (m.quoted?.text || "").trim()   // boleh reply teks
        if (p.needs === "text" && !text) { await m.reply(usageText(p, prefix, command)); return true }

        const react = (e) => sock.sendMessage(m.chat, { react: { text: e, key: m.key } }).catch(() => {})
        try {
            await react("⏳")
            await p.run({ sock, m, args, text, command, prefix, isOwner })
            await react("✅")
        } catch (e) {
            if (e && e.isUsage) {
                await react("❓")
                await m.reply(e.message || usageText(p, prefix, command)).catch(() => {})
            } else {
                console.log(`[${label}] ${p.name} error:`, e?.message || e)
                await react("❌")
                await m.reply(`❌ ${failText}: ${e?.message || e}`).catch(() => {})
            }
        }
        return true
    }

    return {
        load, handle,
        commands: () => (load(), [...byCmd.keys()]),
        list: () => (load(), plugins.map((p) => ({ name: p.name, cmds: p.cmds, desc: p.desc })))
    }
}

module.exports = { createLoader, Usage }
