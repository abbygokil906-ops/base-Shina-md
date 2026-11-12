/*
  Adapter fitur Fun -> Fuyuha Shina MD (file ini bukan fitur: diawali "_" jadi diabaikan loader).

  Plugin di folder ini ditulis dengan gaya "register + run" (rbRegister / dioRegister / oneCommand / adapt).
  Semua fungsi pembantunya ada di sini, jadi plugin-nya sendiri tidak perlu diubah dan tetap jalan di Fuyuha Shina MD:
    - data user & Money      -> global.db.users[jid] (Money = koin RPG Fuyuha Shina MD)
    - data tambahan fitur    -> global.db.fuyuha  (ikut tersimpan otomatis di database.json)
    - nama bot               -> global.namaBot     (settings.js)
  Loader-nya ada di source/Fun.js.
*/
import { createRequire } from 'module'

const nodeRequire = createRequire(import.meta.url)

// ───────── waktu WIB ─────────
export const wibDate = () => new Date(Date.now() + 7 * 3600 * 1000)         // Date yang jamnya sudah digeser ke WIB (format pakai timeZone: 'UTC')
export const wibDay = () => wibDate().toISOString().slice(0, 10)            // 'YYYY-MM-DD' (WIB)
export const dioWib = wibDay
export const durasi = (ms) => {
    const s = Math.max(1, Math.ceil(Number(ms) / 1000))
    if (s >= 3600) return `${Math.floor(s / 3600)} jam ${Math.floor((s % 3600) / 60)} menit`
    if (s >= 60) return `${Math.floor(s / 60)} menit ${s % 60} detik`
    return `${s} detik`
}

// ───────── database ─────────
const db = () => (global.db ||= {})
const extra = () => (db().fuyuha ||= {})

export const dioStore = () => { const s = extra(); s.praktis ||= {}; return s }
export const dioSave = () => {}   // database.json ditulis otomatis tiap beberapa detik oleh main.js
export const persist = dioSave

// pengaturan fitur (menfess): bisa diubah lewat global.db.fuyuha.cfg.menfess
const CFG_DEFAULT = { menfess: { on: true, maxPanjang: 500, cooldownDetik: 60, maxPerHari: 10, biayaLimit: 0 } }
export const cfg = (name) => ({ ...(CFG_DEFAULT[name] || {}), ...((extra().cfg || {})[name] || {}) })
export const store = () => { const s = extra(); s.menfess ||= {}; s.menfessBlock ||= {}; return s }

// user RPG: plugin memakai u.money, di Fuyuha Shina MD mata uangnya "koin" -> disambungkan otomatis
const ALIAS = { money: 'koin' }
export function rpgUser(jid) {
    const all = (db().users ||= {})
    if (typeof all[jid] !== 'object' || all[jid] === null) all[jid] = {}
    const u = all[jid]
    if (typeof u.koin !== 'number') u.koin = 0
    if (typeof u.exp !== 'number') u.exp = 0
    if (typeof u.level !== 'number' || u.level < 1) u.level = 1
    return new Proxy(u, {
        get: (t, k) => t[ALIAS[k] || k],
        set: (t, k, v) => { t[ALIAS[k] || k] = v; return true },
        has: (t, k) => (ALIAS[k] || k) in t,
        deleteProperty: (t, k) => delete t[ALIAS[k] || k]
    })
}

// react (⏳ ✅ ❌)
export const reactTo = (sock, m, emoji) => sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})

// ───────── register / run ─────────
const features = new Map()   // name -> { make, libs, mod }

function buildRequire(libs, cache) {
    const req = (p) => {
        const base = String(p).replace(/^.*\//, '')
        if (libs && libs[base]) {
            if (!cache[base]) { const mod = { exports: {} }; cache[base] = mod; libs[base](mod, mod.exports, req) }
            return cache[base].exports
        }
        return nodeRequire(p)
    }
    return req
}

// dioRegister: fitur gaya modul CommonJS (feature(module, exports, require) -> module.exports = { run, before, ... })
export function dioRegister(name, feature, libs) {
    features.set(name, { kind: 'dio', feature, libs, mod: null })
}

// rbRegister: fitur gaya fungsi (feature(...) -> handler(m, ctx))
export function rbRegister(name, feature) {
    features.set(name, { kind: 'rb', feature, mod: null })
}

async function resolve(name) {
    const f = features.get(name)
    if (!f) throw new Error(`fitur fun "${name}" belum terdaftar`)
    if (f.mod) return f
    if (f.kind === 'dio') {
        const mod = { exports: {} }
        f.feature(mod, mod.exports, buildRequire(f.libs, {}))
        f.mod = mod.exports
    } else {
        f.mod = await f.feature({ rbG: global, rbLib: {} })
    }
    return f
}

const reply = (m) => (t, ...r) => m.reply(t, ...r)

function fullCtx(m, ctx = {}) {
    const sock = ctx.sock || ctx.conn
    return {
        ...ctx,
        m, sock, conn: sock, client: sock,
        reply: ctx.reply || reply(m),
        prefix: ctx.prefix || ctx.usedPrefix || m.prefix,
        usedPrefix: ctx.usedPrefix || ctx.prefix || m.prefix
    }
}

export async function dioRun(name, m, ctx) {
    const f = await resolve(name)
    const c = fullCtx(m, ctx)
    if (f.kind === 'rb') return f.mod(m, c)
    if (typeof f.mod.run !== 'function') return
    return f.mod.run(c)
}
export const rbRun = dioRun

// pesan biasa (bukan command): tiap fitur dio yang punya before() dicek, true = pesan sudah diproses
export async function dioBefore(m, ctx) {
    const c = fullCtx(m, ctx)
    for (const [name, f] of features) {
        if (f.kind !== 'dio') continue
        let r
        try { r = await resolve(name) } catch (_) { continue }
        if (typeof r.mod.before !== 'function') continue
        if (await r.mod.before(c)) return true
    }
    return false
}

// ───────── bentuk command ─────────
// oneCommand(handler, 'nama', { as, subs }): satu file = satu command di menu, command lama jadi sub-command.
//   as   : command lama yang dijalankan kalau user mengetik 'nama' saja
//   subs : false = command lama tidak ikut dikenali
export function oneCommand(plugin, name, opts = {}) {
    const old = [].concat(plugin.command || [])
    const wrapper = (m, ctx) => plugin(m, { ...ctx, command: ctx.command === name && opts.as ? opts.as : ctx.command })
    wrapper.command = [name]
    wrapper.subs = opts.subs === false ? [] : old.filter((c) => c !== name)
    wrapper.hide = []
    wrapper.help = plugin.help
    wrapper.tags = plugin.tags
    wrapper.group = plugin.group
    return wrapper
}

// adapt(handler, { category }): handler biasa (m, ctx) dipakai apa adanya
export function adapt(handler, opt = {}) {
    handler.category = opt.category || handler.category
    return handler
}
