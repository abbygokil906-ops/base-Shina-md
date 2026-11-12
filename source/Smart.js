/*
  Smart.js — fitur tambahan Fuyuha Shina MD
    1. suggest()  : command salah ketik (mis. .touel) -> bot kasih saran command yang benar + persen kemiripan
    2. command()  : .jutek on/off (owner) untuk fitur balas pesan pendek
    3. curt()     : pesan "P" doang -> disuruh salam; pesan "Y/K/G..." doang -> dibalas nyolot
  Pengingat azan ada di source/Adzan.js
*/
const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const norm = (s) => String(s || "").toLowerCase()

// ---------- daftar command yang valid (discan otomatis dari kode, jadi fitur baru ikut terdaftar) ----------
let KNOWN = null
const EXTRA = ["adzan", "azan", "jutek", "scriptvip", "script"]

function walk(dir, out = []) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        if (f.name === "node_modules" || f.name.startsWith(".")) continue
        const p = path.join(dir, f.name)
        if (f.isDirectory()) walk(p, out)
        else if (f.name.endsWith(".js")) out.push(p)
    }
    return out
}

function known() {
    if (KNOWN) return KNOWN
    KNOWN = new Set(EXTRA)
    const files = [path.join(ROOT, "fuyuha.js"), ...walk(path.join(ROOT, "source")), ...walk(path.join(ROOT, "plugins"))]
    for (const f of files) {
        let src = ""
        try { src = fs.readFileSync(f, "utf8") } catch (_) { continue }
        for (const r of src.matchAll(/\bcase\s+["'`]([a-z0-9_]+)["'`]/gi)) KNOWN.add(norm(r[1]))
        for (const r of src.matchAll(/\bcommand\s*===?\s*["'`]([a-z0-9_]+)["'`]/gi)) KNOWN.add(norm(r[1]))
        // command: ["a","b"]  /  cmds: [...]  /  alias: [...]
        for (const r of src.matchAll(/\b(?:command|cmds|alias|commands)\s*:\s*\[([^\]]*)\]/gi))
            for (const s of r[1].matchAll(/["'`]([a-z0-9_]+)["'`]/gi)) KNOWN.add(norm(s[1]))
        // plugin ESM gaya handler.command = [...] / handler.subs = [...] (kategori Fun)
        for (const r of src.matchAll(/\bhandler\.(?:command|subs)\s*=\s*\[([^\]]*)\]/gi))
            for (const s of r[1].matchAll(/["'`]([a-z0-9_]+)["'`]/gi)) KNOWN.add(norm(s[1]))
        // command: "nama"
        for (const r of src.matchAll(/\bcommand\s*:\s*["'`]([a-z0-9_]+)["'`]/gi)) KNOWN.add(norm(r[1]))
        // new Set(["a","b",...])
        for (const r of src.matchAll(/new Set\(\s*\[([^\]]*)\]/gi))
            for (const s of r[1].matchAll(/["'`]([a-z0-9_]+)["'`]/gi)) KNOWN.add(norm(s[1]))
        // plugin RPG/ESM: name: "hunt", alias: [...] + nama file plugin
        if (f.includes(path.sep + "plugins" + path.sep)) {
            for (const r of src.matchAll(/^\s*name\s*:\s*["'`]([a-z0-9_]+)["'`]/gim)) KNOWN.add(norm(r[1]))
            const b = path.basename(f, ".js"); if (!b.startsWith("_")) KNOWN.add(norm(b))
        }
        // daftar command di MenuData (".nama")
        if (path.basename(f) === "MenuData.js") for (const r of src.matchAll(/["'`]\.([a-z0-9_]+)["'`]/gi)) KNOWN.add(norm(r[1]))
        // .includes(command) / array literal tepat sebelum .includes(command)
        for (const r of src.matchAll(/\[([^\]]*)\]\s*\.includes\(\s*command\s*\)/gi))
            for (const s of r[1].matchAll(/["'`]([a-z0-9_]+)["'`]/gi)) KNOWN.add(norm(s[1]))
    }
    return KNOWN
}

// ---------- kemiripan (Levenshtein + Damerau: tukar huruf bersebelahan dihitung 1 kesalahan) ----------
function distance(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
    for (let j = 0; j <= b.length; j++) dp[0][j] = j
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1)
        }
    }
    return dp[a.length][b.length]
}
const similarity = (a, b) => Math.round((1 - distance(a, b) / Math.max(a.length, b.length)) * 100)

const MIN_SIM = 55          // minimal kemiripan (%) supaya disarankan (command panjang lebih longgar, lihat bestMatches)
const sugCooldown = new Map() // sender -> waktu terakhir diberi saran

// command yang tampil di menu = command "resmi"; dipakai buat mengutamakan saran yang benar-benar fitur
let MENU = null
function menuSet() {
    if (MENU) return MENU
    MENU = new Set()
    try {
        const src = fs.readFileSync(path.join(ROOT, "source", "MenuData.js"), "utf8")
        for (const r of src.matchAll(/["'`]\.([a-z0-9_]+)(?:\s[^"'`]*)?["'`]/gi)) MENU.add(norm(r[1]))
    } catch (_) {}
    return MENU
}

function bestMatches(cmd) {
    const out = []
    const menu = menuSet()
    for (const k of known()) {
        if (Math.abs(k.length - cmd.length) > 3) continue
        const s = similarity(cmd, k)
        // awalan sama (mis. "tour" -> "tourl") dianggap mirip juga
        let pre = k.startsWith(cmd) && cmd.length >= 3 ? Math.max(s, 75) : s
        // command panjang (>=7 huruf) boleh lebih jauh salahnya (2-3 huruf) tanpa kehilangan saran
        const min = Math.max(k.length, cmd.length) >= 7 ? MIN_SIM - 5 : MIN_SIM
        if (pre >= min) out.push({ cmd: k, sim: pre, rank: pre + (menu.has(k) ? 4 : 0) })
    }
    return out.sort((a, b) => b.rank - a.rank || a.cmd.length - b.cmd.length).slice(0, 3)
}

// Dipanggil lebih awal di fuyuha.js. return true = pesan sudah dibalas (command tidak dikenal).
async function suggest({ sock, m, command, isOwner }) {
    try {
        if (!command || !/^[a-z]/.test(command) || command.length < 2 || command.length > 20) return false
        if (!/^[a-z0-9_]+$/.test(command)) return false   // ".." atau ".5" dsb bukan command
        if (known().has(command)) return false
        const hit = bestMatches(command)
        if (!hit.length) return false
        const now = Date.now()
        if (now - (sugCooldown.get(m.sender) || 0) < 2500) return true
        sugCooldown.set(m.sender, now)
        const p = m.prefix
        const best = hit[0]
        let txt = `❓ Command *${p}${command}* tidak ada.\n\nMaksud kamu *${p}${best.cmd}* (${best.sim}% mirip)?`
        if (hit.length > 1) txt += `\n\nAtau:\n` + hit.slice(1).map((h) => `• ${p}${h.cmd} (${h.sim}%)`).join("\n")
        txt += `\n\n_Ketik ${p}menu untuk lihat semua fitur._`
        await m.reply(txt)
        return true
    } catch (e) { console.log("[Smart] suggest error:", e.message); return false }
}

// ---------- balas pesan pendek / jutek ----------
const RE_P = /^(?:p[\s,.!?]*)+$/i                         // "P", "p p p p", "pppp"
const RE_CURT = /^(?:y|k|kk|g|n|o|hm+|mm+)[.!?]*$/i       // "Y", "k", "hmm", dst

const REPLY_P = [
    "Assalamualaikum warahmatullahi wabarakatuh kak 🙏\nBukan \"P\" doang dong, yang sopan salam dulu, baru bilang mau apa ya 😊",
    "P P P, emangnya lagi ngabsen? 😅\nMending *Assalamualaikum warahmatullahi wabarakatuh* kak, terus langsung sebut keperluannya.",
    "Assalamualaikum warahmatullahi wabarakatuh kak.\nSalam dulu yang bener, jangan cuma \"P\" 🙏"
]
// Nyolot tapi masih aman (tanpa kata kasar berat / doa jelek)
const REPLY_CURT = [
    "Y doang? Irit amat ngetiknya, jempol lagi dicicil per huruf ya? 🙄",
    "Wih jutek banget chatnya. Ngetik satu huruf doang, kuota abis berapa sih? 😒",
    "Chat apaan nih, singkat-singkat gitu. Yang niat dikit dong ngetiknya, tolol amat... eh maaf, maksudnya kurang niat 😏",
    "Hadeh, jutek bener. Kalau mau ngomong ya yang lengkap, bukan kode morse 🙄",
    "Satu huruf doang dikirim? Sok misterius amat lu 😒"
]
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const curtCooldown = new Map()

// Dipanggil di default: fuyuha.js (setelah semua alur game/jualan yang butuh jawaban "y/n" selesai)
async function curt({ sock, m, isCmd, isOwner }) {
    try {
        const st = global.db?.settings
        if (!st || st.jutek === false) return false       // default: aktif, .jutek off untuk mematikan
        if (isCmd || m.fromMe || isOwner || m.isGroup || m.isBaileys) return false   // hanya chat pribadi
        if (m.mtype !== "conversation" && m.mtype !== "extendedTextMessage") return false
        const t = String(m.body || "").trim()
        if (!t || t.length > 12) return false
        const isP = RE_P.test(t)
        if (!isP && !RE_CURT.test(t)) return false
        const now = Date.now()
        if (now - (curtCooldown.get(m.sender) || 0) < 60000) return true   // 1 menit sekali per orang (anti spam / anti banned)
        curtCooldown.set(m.sender, now)
        await m.reply(pick(isP ? REPLY_P : REPLY_CURT))
        return true
    } catch (e) { console.log("[Smart] curt error:", e.message); return false }
}

// .jutek on|off (owner)
async function command({ sock, m, command, args, isOwner }) {
    if (command === "scriptvip" || command === "script") {
        // fitur jualan script versi VVIP punya NihiluxMD sudah dicabut, command ini sengaja dimatikan
        return false
    }
    if (command !== "jutek") return false
    if (!isOwner) { await m.reply("❌ Khusus owner bot."); return true }
    const st = global.db.settings
    const a = norm(args[0])
    if (a === "on") st.jutek = true
    else if (a === "off") st.jutek = false
    else { await m.reply(`🛡️ Balas pesan jutek (P/Y/K/dst): *${st.jutek === false ? "OFF" : "ON"}*\n\nPakai: ${m.prefix}jutek on / off`); return true }
    await m.reply(`✅ Balas pesan jutek sekarang *${st.jutek ? "ON" : "OFF"}*`)
    return true
}

module.exports = { suggest, curt, command, similarity, known, bestMatches }
