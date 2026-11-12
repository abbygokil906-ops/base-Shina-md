/*
  RPG — kategori "RPG" di Fuyuha Shina MD.

  Plugin RPG ada di folder /plugins/rpg (format ESM, asalnya dari bot lain). Cara kerjanya sama seperti Game.js:
  modul ini memuat semua file di folder itu, membungkus objek pesan, lalu memetakan command + alias-nya.
  Mau tambah fitur RPG baru? Taruh file .js di folder /plugins/rpg (nama file diawali "_" = diabaikan), lalu tambahkan
  nama commandnya di source/MenuData.js supaya tampil di menu.

  Alur user:
    1. .daftar nama,umur   (umur 10-40)   -> wajib sebelum .menu dan sebelum main RPG
    2. .menu / .rpg                         -> RPG langsung jalan, tidak perlu daftar lagi
    3. Main RPG (daily, work, mining, ...)  -> dapat koin
    4. .belilimit <jumlah>                  -> koin ditukar jadi limit (harga: Limit.LIMIT_PRICE / limit)

  Data RPG disimpan di global.db.users[jid] (satu tempat dengan limit & premium), lewat jembatan rpg/_db.js.
*/
const fs = require("fs")
const path = require("path")
const { pathToFileURL } = require("url")
const Limit = require("./Limit.js")

const DIR = path.join(__dirname, "..", "plugins", "rpg")
const byCmd = new Map() // command/alias -> plugin
const plugins = [] // { name, cmds, cfg, fn, mod, file }

const MIN_AGE = 10
const MAX_AGE = 40
const START_KOIN = 10000 // modal awal setelah daftar

// command yang menampilkan menu (ditangani fuyuha.js) — wajib daftar dulu
const MENU_CMDS = new Set(["menu", "allmenu", "game", "gamemenu", "rpg", "rpgmenu"])
const REG_CMDS = new Set(["daftar", "register", "reg"])
const PROFILE_CMDS = new Set(["profil", "profile", "me"])
const BUYLIMIT_CMDS = new Set(["belilimit", "buylimit", "beli-limit"])
const BUILTIN = new Set([...REG_CMDS, ...PROFILE_CMDS, ...BUYLIMIT_CMDS])

const rp = (n) => Number(n || 0).toLocaleString("id-ID")

let loading = null
function load() {
    if (loading) return loading
    loading = (async () => {
        let files = []
        try {
            files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js") && !f.startsWith("_")).sort()
        } catch (e) {
            console.log("[RPG] folder plugins/rpg tidak ditemukan:", DIR)
            return
        }
        const skipped = []
        for (const f of files) {
            try {
                const mod = await import(pathToFileURL(path.join(DIR, f)).href)
                const d = mod.default
                if (!d || typeof d.handler !== "function") {
                    console.log(`[RPG] ${f}: bentuk plugin tidak dikenali, dilewati`)
                    continue
                }
                const cfg = d.config || {}
                if (cfg.isEnabled === false) continue
                const names = [cfg.name, ...(cfg.alias || [])].filter(Boolean).map((x) => String(x).toLowerCase())
                if (!names.length) continue
                const p = { name: names[0], cmds: names, cfg, fn: d.handler, mod, file: f }
                plugins.push(p)
                for (const n of names) {
                    if (BUILTIN.has(n) || MENU_CMDS.has(n)) {
                        skipped.push(`${n} (${f})`)
                        continue
                    }
                    if (!byCmd.has(n)) byCmd.set(n, p)
                }
            } catch (e) {
                console.log(`[RPG] gagal memuat ${f}:`, e.message)
            }
        }
        if (skipped.length) console.log("[RPG] nama command bentrok dengan bawaan, dilewati:", skipped.join(", "))
        console.log(`[RPG] ${plugins.length} fitur RPG dimuat`)
    })()
    return loading
}

// ===== data user =====
const userOf = (jid) => (global.db && global.db.users && typeof global.db.users[jid] === "object" ? global.db.users[jid] : null)
const isRegistered = (jid) => !!(userOf(jid) && userOf(jid).registered === true)

function ensureRpgUser(jid) {
    if (!global.db.users) global.db.users = {}
    if (typeof global.db.users[jid] !== "object" || global.db.users[jid] === null) global.db.users[jid] = {}
    const u = global.db.users[jid]
    if (typeof u.koin !== "number") u.koin = 0
    if (typeof u.exp !== "number") u.exp = 0
    if (typeof u.level !== "number" || u.level < 1) u.level = 1
    if (typeof u.rpg !== "object" || !u.rpg) u.rpg = {}
    if (typeof u.inventory !== "object" || !u.inventory) u.inventory = {}
    return u
}

// ===== pesan =====
const belumDaftarText = (prefix) =>
    `⚠️ *Kamu belum daftar!*\n\n` +
    `Daftar dulu biar bisa pakai menu & main RPG:\n` +
    `*${prefix}daftar nama,umur*\n\n` +
    `Contoh: *${prefix}daftar Budi,17*\n` +
    `📌 Umur yang diterima: ${MIN_AGE}–${MAX_AGE} tahun.`

// ===== .daftar nama,umur =====
async function daftar(m, args) {
    const prefix = m.prefix || "."
    const u0 = userOf(m.sender)
    if (u0 && u0.registered === true) {
        return m.reply(
            `✅ Kamu sudah terdaftar!\n\n👤 Nama : ${u0.regName}\n🎂 Umur : ${u0.regAge} tahun\n\nLangsung ketik *${prefix}menu* atau *${prefix}rpg* buat mulai.`
        )
    }
    const raw = args.join(" ").trim()
    const usage = `*Format:* ${prefix}daftar nama,umur\n*Contoh:* ${prefix}daftar Budi,17\n📌 Umur yang diterima: ${MIN_AGE}–${MAX_AGE} tahun.`
    if (!raw) return m.reply(`📝 *Pendaftaran*\n\n${usage}`)

    let name, ageStr
    if (raw.includes(",")) {
        const i = raw.lastIndexOf(",")
        name = raw.slice(0, i).trim()
        ageStr = raw.slice(i + 1).trim()
    } else {
        const mt = raw.match(/^(.+?)\s+(\d+)$/) // toleransi: "budi 17"
        if (!mt) return m.reply(`❌ Format salah.\n\n${usage}`)
        name = mt[1].trim()
        ageStr = mt[2]
    }
    if (!name || !ageStr) return m.reply(`❌ Format salah.\n\n${usage}`)
    if (!/^\d{1,3}$/.test(ageStr)) return m.reply(`❌ Umur harus berupa angka.\n\n${usage}`)
    if (name.length < 2 || name.length > 20) return m.reply(`❌ Nama harus 2–20 karakter.\n\n${usage}`)
    if (!/^[\p{L}\p{N} ._'-]+$/u.test(name)) return m.reply(`❌ Nama cuma boleh huruf, angka, dan spasi.\n\n${usage}`)
    const age = parseInt(ageStr, 10)
    if (age < MIN_AGE || age > MAX_AGE) return m.reply(`❌ Umur harus antara *${MIN_AGE}–${MAX_AGE} tahun*.\n\n${usage}`)

    const u = ensureRpgUser(m.sender)
    u.registered = true
    u.regName = name
    u.regAge = age
    u.regTime = Date.now()
    u.koin += START_KOIN

    return m.reply(
        `🎉 *Pendaftaran berhasil!*\n\n` +
            `👤 Nama : ${name}\n🎂 Umur : ${age} tahun\n💰 Bonus awal : *+${rp(START_KOIN)} koin*\n\n` +
            `Sekarang kamu bisa pakai *${prefix}menu*. RPG langsung jalan, nggak perlu daftar lagi — coba *${prefix}daily* dulu buat klaim hadiah harian 😎\n\n` +
            `💡 Koin RPG bisa ditukar jadi limit: *${prefix}belilimit <jumlah>* (${rp(Limit.LIMIT_PRICE)} koin / limit).`
    )
}

// ===== .profil =====
async function profil(m, isOwner) {
    const u = ensureRpgUser(m.sender)
    const st = Limit.status(m, isOwner)
    const r = u.rpg
    return m.reply(
        `╭─「 👤 *PROFIL RPG* 」\n` +
            `│ 🙍 *Nama*   : ${u.regName || "-"}\n` +
            `│ 🎂 *Umur*   : ${u.regAge ? u.regAge + " tahun" : "-"}\n` +
            `│ 🥠 *Status* : ${st.label}\n` +
            `│ 📊 *Limit*  : ${Limit.limitText(st)}\n` +
            `│ 🏅 *Level*  : ${u.level}\n` +
            `│ ✨ *EXP*    : ${rp(u.exp)} / ${rp(u.level * 1000)}\n` +
            `│ 💰 *Koin*   : ${rp(u.koin)}\n` +
            `│ 🏦 *Bank*   : ${rp(r.bank)}\n` +
            `│ ❤️ *HP*     : ${r.health ?? 100}\n` +
            `│ ⚡ *Stamina*: ${r.stamina ?? 100}\n` +
            `╰──────────────⦁`
    )
}

// ===== .belilimit <jumlah> =====
async function beliLimit(m, args, isOwner) {
    const prefix = m.prefix || "."
    const st = Limit.status(m, isOwner)
    if (st.unlimited) return m.reply(`♾️ Kamu sudah *${st.label}* — limit unlimited, nggak perlu beli limit.`)

    const u = ensureRpgUser(m.sender)
    const price = Limit.LIMIT_PRICE
    const room = Math.max(0, Limit.MAX_LIMIT - st.user.limit)
    const arg = String(args[0] || "").toLowerCase()

    if (!arg) {
        return m.reply(
            `🛒 *BELI LIMIT*\n\n` +
                `💰 Koin kamu : *${rp(u.koin)}*\n` +
                `📊 Limit kamu : *${Limit.limitText(st)}*\n` +
                `🏷️ Harga : *${rp(price)} koin* / 1 limit\n` +
                `📦 Maksimal simpanan : ${Limit.MAX_LIMIT} limit\n\n` +
                `*Contoh:*\n${prefix}belilimit 5\n${prefix}belilimit max (beli sebanyak koin kamu cukup)\n\n` +
                `Koin kurang? Cari dulu lewat RPG: *${prefix}daily*, *${prefix}work*, *${prefix}mining*, dll.`
        )
    }

    let n
    if (arg === "max" || arg === "all") n = Math.min(Math.floor(u.koin / price), room)
    else if (/^\d{1,4}$/.test(arg)) n = parseInt(arg, 10)
    else return m.reply(`❌ Jumlah harus angka.\nContoh: *${prefix}belilimit 5*`)

    if (n < 1) {
        if (room <= 0) return m.reply(`📦 Simpanan limit kamu sudah penuh (maks ${Limit.MAX_LIMIT}).`)
        return m.reply(`❌ Koin kamu belum cukup buat beli 1 limit.\n💰 Koin: ${rp(u.koin)}\n🏷️ Harga: ${rp(price)} koin / limit\n\nMain RPG dulu buat cari koin!`)
    }
    if (n > room) {
        if (room <= 0) return m.reply(`📦 Simpanan limit kamu sudah penuh (maks ${Limit.MAX_LIMIT}).`)
        return m.reply(`❌ Kebanyakan! Kamu cuma bisa nambah *${room}* limit lagi (maks simpanan ${Limit.MAX_LIMIT}).`)
    }
    const cost = n * price
    if (u.koin < cost) {
        return m.reply(
            `❌ *Koin kurang!*\n\n🛒 Beli ${n} limit = *${rp(cost)} koin*\n💰 Koin kamu = *${rp(u.koin)}*\n📉 Kurang = *${rp(cost - u.koin)}*\n\nMain RPG dulu buat cari koin ⚔️`
        )
    }

    u.koin -= cost
    const added = Limit.addLimit(m.sender, n)
    const st2 = Limit.status(m, isOwner)
    return m.reply(
        `✅ *Beli limit berhasil!*\n\n` +
            `📊 Limit : *+${added}*  →  *${Limit.limitText(st2)}*\n` +
            `💸 Bayar : -${rp(cost)} koin\n` +
            `💰 Sisa koin : *${rp(u.koin)}*`
    )
}

// ===== bungkus pesan supaya cocok dengan yang diharapkan plugin =====
function wrap(sock, m, text, command) {
    // salinan dangkal (bukan Object.create) supaya m.key / m.message tetap properti milik sendiri (dipakai untuk quoted)
    const w = Object.assign(Object.create(Object.getPrototypeOf(m)), m)
    w.text = text
    w.command = command
    w.args = text ? text.split(/\s+/) : []
    w.name = m.pushName
    w.react = (emoji) => sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})
    w.replyImage = (url, caption = "") => sock.sendMessage(m.chat, { image: { url }, caption }, { quoted: m })
    return w
}

const fmtTime = (s) => {
    s = Math.ceil(s)
    if (s >= 3600) return `${Math.floor(s / 3600)} jam ${Math.floor((s % 3600) / 60)} menit`
    if (s >= 60) return `${Math.floor(s / 60)} menit ${s % 60} detik`
    return `${s} detik`
}

async function run(plugin, { sock, m, command, text, args, isOwner }) {
    const cfg = plugin.cfg || {}
    const prefix = m.prefix || "."

    if (cfg.isOwner && !isOwner) return m.reply(global.mess?.owner || "Fitur ini hanya untuk ownerbot.")
    if (cfg.isPremium && !isOwner && !Limit.isPremium(m)) return m.reply("💎 Fitur ini khusus user *Premium*.")
    if (cfg.isGroup && !m.isGroup) return m.reply(global.mess?.group || "Fitur ini hanya dapat digunakan di grup.")
    if (cfg.isPrivate && m.isGroup) return m.reply(global.mess?.private || "Fitur ini hanya dapat digunakan di private chat.")

    // cooldown per user per fitur
    const u = ensureRpgUser(m.sender)
    if (typeof u.rpgCd !== "object" || !u.rpgCd) u.rpgCd = {}
    const cd = Number(cfg.cooldown) || 0
    const now = Date.now()
    const prev = u.rpgCd[plugin.name] || 0
    if (cd > 0 && now - prev < cd * 1000) {
        const left = (cd * 1000 - (now - prev)) / 1000
        return m.reply(`⏳ Sabar kak, *${prefix}${command}* bisa dipakai lagi dalam *${fmtTime(left)}*.`)
    }
    if (cd > 0) u.rpgCd[plugin.name] = now

    const mm = wrap(sock, m, text, command)
    try {
        await plugin.fn(mm, { sock, conn: sock, client: sock, args, text, command, cmd: command, usedPrefix: prefix, prefix, isOwner, plugin })
    } catch (e) {
        console.log(`[RPG] ${plugin.name} error:`, e)
        if (cd > 0) u.rpgCd[plugin.name] = prev // gagal jalan -> cooldown tidak dihitung
        try {
            await m.reply(`❌ Fitur RPG gagal dijalankan: ${e.message || e}`)
        } catch (_) {}
    }
}

/**
 * Dipanggil dari fuyuha.js untuk setiap command.
 * return true  -> command sudah ditangani (jangan lanjut)
 * return false -> bukan urusan RPG (lanjut ke switch fuyuha.js, termasuk .menu yang sudah lolos cek daftar)
 */
async function handle({ sock, m, command, args, isOwner }) {
    await load()

    if (REG_CMDS.has(command)) {
        await daftar(m, args)
        return true
    }

    const isRpgCmd = byCmd.has(command) || PROFILE_CMDS.has(command) || BUYLIMIT_CMDS.has(command)
    if (!isRpgCmd && !MENU_CMDS.has(command)) return false

    // wajib daftar dulu (owner dikecualikan)
    if (!isOwner && !isRegistered(m.sender)) {
        await m.reply(belumDaftarText(m.prefix || "."))
        return true
    }

    if (MENU_CMDS.has(command)) return false // biar fuyuha.js yang menampilkan menu

    if (PROFILE_CMDS.has(command)) {
        await profil(m, isOwner)
        return true
    }
    if (BUYLIMIT_CMDS.has(command)) {
        await beliLimit(m, args, isOwner)
        return true
    }

    await run(byCmd.get(command), { sock, m, command, text: args.join(" "), args, isOwner })
    return true
}

// Gerbang daftar untuk SEMUA command (dipanggil dari fuyuha.js sebelum kategori mana pun).
// true  = diblokir (sudah dibalas "belum daftar"); false = lanjut.
// Dikecualikan: owner, dan .daftar/.register/.reg.
async function gateAll({ m, command, isOwner }) {
    if (isOwner || REG_CMDS.has(command) || isRegistered(m.sender)) return false
    await m.reply(belumDaftarText(m.prefix || "."))
    return true
}

// true = user ini BELUM daftar dan command-nya butuh daftar (dipakai Limit supaya limit tidak terpotong sebelum daftar)
function blockedUnregistered({ m, command, isOwner }) {
    return !(isOwner || REG_CMDS.has(command) || isRegistered(m.sender))
}

module.exports = {
    load,
    handle,
    gateAll,
    blockedUnregistered,
    isRegistered,
    MIN_AGE,
    MAX_AGE,
    START_KOIN,
    MENU_CMDS,
    list: () => plugins.map((p) => ({ name: p.name, cmds: p.cmds })),
    commands: () => [...byCmd.keys()],
}
