/*
  Warung — toko digital di dalam bot: Nokos + Script (zip) + Panel Pterodactyl.

  - Mode: .modewarung on / off  (jalan berdampingan dengan .nokosmode)
  - Halaman awal cuma 3 kategori (Nokos, Script, Panel), semua lewat tombol
  - Pembayaran QRIS lewat Welper Payment Gateway (source/GatewayApi.js), status dicek otomatis (polling)
  - Harga panel & produk script: settings.js (global.warung) + bisa ditambah lewat chat (.settingwarung)
  - Notifikasi transaksi ke saluran: TEKS SAJA (tanpa foto & tombol)
*/
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const axios = require("axios")
const Gw = require("./GatewayApi.js")
const Spec = require("./PanelSpec.js")
const Button = require("./Button.js")
const { sendNative, urlButton, quickButton } = Button

const ROOT = path.join(__dirname, "..")
const FILE_DIR = path.join(ROOT, "storage", "warung")
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const cfg = () => global.warung || {}
const S = (fallback) => global.sock || fallback

// ===================== STATE & SETTING =====================
function store() {
    const d = global.db
    if (!d.warung || typeof d.warung !== "object") d.warung = {}
    const w = d.warung
    if (!w.orders) w.orders = {}
    if (!Array.isArray(w.panels)) w.panels = []
    if (!Array.isArray(w.scripts)) w.scripts = []
    if (!w.price || typeof w.price !== "object") w.price = {}
    if (typeof w.seq !== "number") w.seq = 0
    return w
}
function st() {
    const s = global.db.settings
    if (!s.warung || typeof s.warung !== "object") s.warung = {}
    const n = s.warung
    if (typeof n.mode !== "boolean") n.mode = false
    if (typeof n.channelId !== "string") n.channelId = ""
    if (typeof n.namaToko !== "string") n.namaToko = ""
    if (typeof n.gwApiKey !== "string") n.gwApiKey = ""
    if (typeof n.feeBearer !== "string") n.feeBearer = ""
    return n
}
const modeOn = () => { try { return !!st().mode } catch { return false } }
const nokosOn = () => { try { return !!(global.db.settings.nokos && global.db.settings.nokos.mode) } catch { return false } }
const toko = () => st().namaToko || cfg().namaWarung || global.namaBot || "WARUNG"
const channelId = () => st().channelId || (global.db.settings.nokos && global.db.settings.nokos.channelId) || ""
const feeBearer = () => st().feeBearer || (cfg().gateway && cfg().gateway.feeBearer) || "customer"

function userOf(jid) {
    if (!global.db.users[jid] || typeof global.db.users[jid] !== "object") global.db.users[jid] = {}
    return global.db.users[jid]
}

// ===================== FORMAT =====================
const rp = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID")
const wib = (ts) =>
    new Date(ts || Date.now())
        .toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
        .replace(/\./g, ":") + " WIB"
const maskNum = (s) => {
    const d = String(s || "").replace(/\D/g, "")
    if (d.length < 8) return d || "-"
    return d.slice(0, 4) + "*".repeat(Math.max(3, d.length - 7)) + d.slice(-3)
}
const cut = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s }
const botJid = (sock) => (sock.decodeJid ? sock.decodeJid(sock.user.id) : String(sock.user.id).split(":")[0] + "@s.whatsapp.net")
const isPlaceholder = (v) => !v || /^ISI_|ISI_DOMAIN|ISI_API/i.test(String(v))

// ===================== KIRIM PESAN =====================
async function say(sock, jid, body, buttons, { footer, image, quoted } = {}) {
    try {
        return await sendNative(
            sock, jid,
            { body, footer: footer || `© ${toko()}`, buttons, image: image || null },
            { userJid: botJid(sock), ...(quoted ? { quoted } : {}) }
        )
    } catch (e) {
        console.log("[Warung] kirim tombol gagal, kirim biasa:", e.message)
        if (image) return sock.sendMessage(jid, { image, caption: body }, quoted ? { quoted } : {})
        return sock.sendMessage(jid, { text: body }, quoted ? { quoted } : {})
    }
}
const reply = (sock, m, text, buttons) => (buttons ? say(sock, m.chat, text, buttons, { quoted: m }) : sock.sendMessage(m.chat, { text }, { quoted: m }))

// list dengan beberapa section: sections = [{ title, rows: [{ title, description, id }] }]
const listSections = (text, sections) => ({
    name: "single_select",
    buttonParamsJson: JSON.stringify({
        title: text,
        sections: sections.map((s) => ({
            title: cut(s.title, 24),
            rows: s.rows.map((r) => ({ header: "", title: cut(r.title, 24), description: cut(r.description || "", 72), id: r.id }))
        }))
    })
})

function notifyOwner(sock, text) {
    try { sock.sendMessage(String(global.owner) + "@s.whatsapp.net", { text }).catch(() => {}) } catch (e) {}
}

// notifikasi ke saluran: teks saja, tanpa foto & tombol
async function toChannel(sock, text) {
    const id = channelId()
    if (!id) return false
    try { await sock.sendMessage(id, { text }); return true } catch (e) {
        console.log("[Warung] kirim ke saluran gagal:", e.message)
        return false
    }
}

// ===================== PRODUK =====================
const TIERS = ["1gb", "2gb", "3gb", "4gb", "5gb", "6gb", "7gb", "8gb", "9gb", "10gb", "unlimited"]
const gb = (mb) => (String(mb) === "0" ? "Unlimited" : `${Number(mb) / 1000} GB`)
const cpuText = (c) => (String(c) === "0" ? "Unlimited" : `${c}%`)
const hari = () => Number((cfg().panel || {}).masaAktifHari) || 30

function panelProducts() {
    const w = store()
    const hp = cfg().hargaPanel || {}
    const out = []
    for (const k of TIERS) {
        const harga = Number(w.price[k] !== undefined ? w.price[k] : hp[k]) || 0
        if (harga <= 0) continue
        const sp = Spec[k]
        out.push({ id: k, nama: k === "unlimited" ? "Panel Unlimited" : `Panel ${k.replace("gb", "")} GB`, ram: sp.ram, disk: sp.disk, cpu: sp.cpu, harga, builtin: true })
    }
    for (const p of w.panels) if (Number(p.harga) > 0) out.push({ ...p })
    return out
}
const findPanel = (id) => panelProducts().find((p) => p.id === id)

function scriptProducts() {
    const base = (cfg().produkScript || []).map((s, i) => ({ id: s.id || `st${i + 1}`, ...s, fromSettings: true }))
    return [...base, ...store().scripts].filter((s) => Number(s.harga) > 0)
}
const findScript = (id) => scriptProducts().find((s) => s.id === id)

// ===================== HALAMAN =====================
async function showHome(sock, m, isOwner) {
    const u = userOf(m.sender)
    if (Date.now() - (u.warungHomeAt || 0) < 4000) return true // cegah spam
    u.warungHomeAt = Date.now()
    u.warungAwait = null
    const nama = m.pushName || "Kak"
    const rows = [
        { title: "🖥️ Panel", description: "Server Node.js, RAM 1 GB sampai unlimited", id: ".wr panel" },
        { title: "🧩 Script", description: "Script siap pakai, kirim otomatis", id: ".wr script" },
        { title: "📲 Nokos", description: "Nomor OTP semua layanan", id: ".nokos" }
    ]
    const buttons = [
        listSections("📂 Pilih kategori", [{ title: "Kategori", rows }]),
        urlButton("📢 Saluran", global.linkChannel || "https://whatsapp.com"),
        quickButton("👑 Owner", ".owner")
    ]
    await say(sock, m.chat,
        `🏪 *${toko()}*\n\nHalo *${nama}* 👋\nMau belanja apa hari ini?\n\n✨ _Tekan tombol di bawah buat pilih kategori_`,
        buttons, { image: global.thumbnail, quoted: m })
    return true
}

async function panelPage(sock, m) {
    const list = panelProducts()
    if (!list.length) return reply(sock, m, "🖥️ Paket panel belum tersedia.", [quickButton("🏠 Beranda", ".start")])
    const row = (p) => ({
        title: `🖥️ ${p.nama}`,
        description: `${rp(p.harga)} • Disk ${gb(p.disk)} • CPU ${cpuText(p.cpu)}`,
        id: `.wr p ${p.id}`
    })
    const idx = (id) => TIERS.indexOf(id)
    const a = list.filter((p) => p.builtin && idx(p.id) >= 0 && idx(p.id) < 5)
    const b = list.filter((p) => p.builtin && idx(p.id) >= 5 && idx(p.id) < 10)
    const c = list.filter((p) => !p.builtin || p.id === "unlimited")
    const sections = [
        { title: "RAM 1 - 5 GB", rows: a.map(row) },
        { title: "RAM 6 - 10 GB", rows: b.map(row) },
        { title: "Unlimited & Lainnya", rows: c.map(row) }
    ].filter((s) => s.rows.length)
    await say(sock, m.chat,
        `🖥️ *Panel*\n\nMasa aktif *${hari()} hari* • Server Node.js\n✨ _Pilih paket lewat tombol_`,
        [listSections("📦 Pilih Paket", sections), quickButton("🏠 Beranda", ".start")], { quoted: m })
}

async function panelDetail(sock, m, id) {
    const p = findPanel(id)
    if (!p) return reply(sock, m, "Paket tidak ditemukan.", [quickButton("🖥️ Lihat Paket", ".wr panel")])
    await say(sock, m.chat,
        `🖥️ *${p.nama}*\n\n💾 RAM  : ${gb(p.ram)}\n📀 Disk : ${gb(p.disk)}\n⚙️ CPU  : ${cpuText(p.cpu)}\n🗓️ Aktif : ${hari()} hari\n\n💵 *${rp(p.harga)}*`,
        [quickButton("🛒 Beli Sekarang", `.wr bp ${p.id}`), quickButton("⬅️ Paket Lain", ".wr panel"), quickButton("🏠 Beranda", ".start")], { quoted: m })
}

async function scriptPage(sock, m) {
    const list = scriptProducts()
    if (!list.length) return reply(sock, m, "🧩 Script belum tersedia.", [quickButton("🏠 Beranda", ".start")])
    const cats = {}
    for (const s of list) (cats[s.kategori || "Lainnya"] = cats[s.kategori || "Lainnya"] || []).push(s)
    const sections = []
    for (const [k, arr] of Object.entries(cats)) {
        for (let i = 0; i < arr.length; i += 10) {
            sections.push({
                title: arr.length > 10 ? `${k} ${Math.floor(i / 10) + 1}` : k,
                rows: arr.slice(i, i + 10).map((s) => ({ title: `🧩 ${s.nama}`, description: `${rp(s.harga)} • ${s.deskripsi || ""}`, id: `.wr s ${s.id}` }))
            })
        }
    }
    await say(sock, m.chat,
        `🧩 *Script*\n\n${list.length} script tersedia, dikirim otomatis (zip) setelah bayar.\n✨ _Pilih script lewat tombol_`,
        [listSections("📂 Pilih Script", sections.slice(0, 10)), quickButton("🏠 Beranda", ".start")], { quoted: m })
}

async function scriptDetail(sock, m, id) {
    const s = findScript(id)
    if (!s) return reply(sock, m, "Script tidak ditemukan.", [quickButton("🧩 Lihat Script", ".wr script")])
    await say(sock, m.chat,
        `🧩 *${s.nama}*\n🏷️ ${s.kategori || "Lainnya"}\n\n${s.deskripsi || "-"}\n\n💵 *${rp(s.harga)}*`,
        [quickButton("🛒 Beli Sekarang", `.wr bs ${s.id}`), quickButton("⬅️ Script Lain", ".wr script"), quickButton("🏠 Beranda", ".start")], { quoted: m })
}

const STATUS = {
    menunggu: "⏳ menunggu bayar", lunas: "💳 lunas (diproses)", selesai: "✅ selesai",
    kedaluwarsa: "⌛ kedaluwarsa", dibatalkan: "🚫 dibatalkan"
}
async function myOrders(sock, m) {
    const list = Object.values(store().orders).filter((o) => o.sender === m.sender).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
    if (!list.length) return reply(sock, m, "🧾 Belum ada pesanan.", [quickButton("🏠 Beranda", ".start")])
    const pend = list.find((o) => o.status === "menunggu")
    await say(sock, m.chat,
        `🧾 *Pesanan Kamu*\n\n${list.map((o) => `• ${o.productName}\n  ${rp(o.price)} • ${STATUS[o.status] || o.status}\n  ${o.id}`).join("\n\n")}`,
        [...(pend ? [quickButton("🔄 Cek Tagihan", `.wr c ${pend.id}`)] : []), quickButton("🏠 Beranda", ".start")], { quoted: m })
}

// ===================== PEMBAYARAN =====================
const gwFailText = (e) => ({
    no_api_key: "Pembayaran belum disiapkan owner.",
    unauthorized: "Pembayaran belum siap (API key gateway salah).",
    network: "Gateway lagi gangguan, coba sebentar lagi ya.",
    rate_limited: "Terlalu cepat, tunggu beberapa detik lalu coba lagi.",
    too_many_pending: "Gateway sedang penuh, coba lagi beberapa menit.",
    gateway_closed: "Pembayaran sedang ditutup sementara.",
    gateway_unavailable: "Pembayaran sedang gangguan, coba lagi nanti.",
    account_locked: "Pembayaran sedang tidak tersedia. Hubungi owner.",
    invalid_amount: "Nominal produk tidak valid (Rp1.000 - Rp5.000.000). Hubungi owner."
}[e.code] || `Pembayaran gagal dibuat: ${e.message}`)

async function startPayment(sock, m, type, prod, extra = {}) {
    const w = store()
    const pend = Object.values(w.orders).find((o) => o.sender === m.sender && o.status === "menunggu")
    if (pend) {
        return say(sock, m.chat, `⏳ Masih ada tagihan belum dibayar:\n*${pend.productName}* • ${rp(pend.price)}\n\nSelesaikan atau batalkan dulu ya.`,
            [quickButton("🔄 Cek Tagihan", `.wr c ${pend.id}`), quickButton("❌ Batalkan", `.wr x ${pend.id}`)], { quoted: m })
    }
    const amount = Math.round(Number(prod.harga))
    if (!(amount >= 1000 && amount <= 5000000)) return reply(sock, m, "Harga produk di luar batas gateway (Rp1.000 - Rp5.000.000). Hubungi owner.")

    const id = "WR" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase()
    let p
    try {
        p = (await Gw.create({
            amount,
            merchant_ref: id,
            customer_name: cut(m.pushName || "Pembeli", 60),
            description: cut(`${type === "panel" ? "Panel" : "Script"} ${prod.nama}`, 120),
            fee_bearer: feeBearer()
        })).data
    } catch (e) {
        console.log("[Warung] buat pembayaran gagal:", e.code, e.message)
        if (["no_api_key", "unauthorized", "account_locked"].includes(e.code)) notifyOwner(sock, `⚠️ Gateway Warung bermasalah (${e.code}): ${e.message}\nCek global.warung.gateway.apiKey / .cekgateway`)
        return reply(sock, m, `⚠️ ${gwFailText(e)}`)
    }

    const rec = {
        id, type, productId: prod.id, productName: prod.nama, price: amount,
        sender: m.sender, chat: m.chat, name: m.pushName || "",
        ref: p.ref, total: p.total, fee: p.fee, payUrl: p.payment_url,
        status: "menunggu", createdAt: Date.now(), expiresAt: Date.parse(p.expires_at) || Date.now() + 15 * 60000,
        ...extra
    }
    if (type === "script") rec.deliver = { file: prod.file || "", link: prod.link || "", fileName: prod.fileName || "" }
    if (type === "panel") rec.spec = { ram: prod.ram, disk: prod.disk, cpu: prod.cpu }
    w.orders[id] = rec

    let qr = null
    try { qr = await require("qrcode").toBuffer(p.qris_string, { width: 560, margin: 2 }) } catch (e) { qr = null }
    await say(sock, m.chat,
        `🧾 *Tagihan ${rec.id}*\n\n📦 ${rec.productName}${rec.username ? ` (${rec.username})` : ""}\n💳 Bayar : *${rp(rec.total)}*\n⏱️ Batas : ${wib(rec.expiresAt)}\n\nScan QRIS, bayar *pas sesuai total* (sudah termasuk kode unik).\nOtomatis diproses setelah lunas.${qr ? "" : "\nBuka halaman bayar untuk melihat QR."}`,
        [urlButton("💳 Halaman Bayar", rec.payUrl), quickButton("🔄 Cek Status", `.wr c ${rec.id}`), quickButton("❌ Batalkan", `.wr x ${rec.id}`)],
        { image: qr, quoted: m })
}

// ----- cek status ke gateway -----
let backoffUntil = 0
async function refresh(sock, rec) {
    if (rec.status !== "menunggu") return rec.status
    let p
    try { p = (await Gw.get(rec.ref)).data } catch (e) {
        if (e.code === "rate_limited") { backoffUntil = Date.now() + (e.retryAfter || 30) * 1000; return rec.status }
        if (e.code === "not_found") return finalize(sock, rec, "kedaluwarsa")
        if (Date.now() > rec.expiresAt + 10 * 60000) return finalize(sock, rec, "kedaluwarsa")
        return rec.status
    }
    if (p.status === "paid") return onPaid(sock, rec)
    if (p.status === "canceled") return finalize(sock, rec, "dibatalkan")
    if (p.status === "expired") {
        // masa toleransi: pelanggan yang telat bayar masih bisa jadi "paid", tunggu 3 menit
        if (!rec.expiredAt) rec.expiredAt = Date.now()
        if (Date.now() - rec.expiredAt > 3 * 60000) return finalize(sock, rec, "kedaluwarsa")
    }
    return rec.status
}

async function finalize(sock, rec, status) {
    if (rec.status !== "menunggu") return rec.status
    rec.status = status
    rec.closedAt = Date.now()
    try {
        await sock.sendMessage(rec.chat, {
            text: status === "kedaluwarsa"
                ? `⌛ Tagihan *${rec.id}* kedaluwarsa.\nBuat pesanan baru lewat tombol Beranda ya.`
                : `🚫 Tagihan *${rec.id}* dibatalkan.`
        })
    } catch (e) {}
    return status
}

async function onPaid(sock, rec) {
    if (rec.status !== "menunggu") return rec.status
    rec.status = "lunas"
    rec.paidAt = Date.now()
    try { await sock.sendMessage(rec.chat, { text: `✅ *Pembayaran diterima*\n${rec.productName} • ${rp(rec.price)}\nPesanan sedang diproses...` }) } catch (e) {}
    await fulfill(sock, rec)
    return rec.status
}

// ===================== PENGIRIMAN PRODUK =====================
const mimeOf = (f) => ({ zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed", pdf: "application/pdf", js: "text/javascript", txt: "text/plain" }[String(f).split(".").pop().toLowerCase()] || "application/octet-stream")
const resolveFile = (f) => (path.isAbsolute(f) ? f : path.join(ROOT, f))

async function deliverScript(sock, rec) {
    const d = rec.deliver || {}
    if (d.file) {
        const fp = resolveFile(d.file)
        if (!fs.existsSync(fp)) throw new Error(`File script tidak ditemukan: ${d.file}`)
        const fileName = d.fileName || path.basename(fp)
        await sock.sendMessage(rec.chat, { document: { url: fp }, fileName, mimetype: mimeOf(fileName), caption: `🧩 *${rec.productName}*\nTerima kasih sudah order! 🙏` })
    }
    if (d.link) await sock.sendMessage(rec.chat, { text: `🧩 *${rec.productName}*\n🔗 ${d.link}\n\nTerima kasih sudah order! 🙏` })
    if (!d.file && !d.link) throw new Error("Produk script ini belum punya file/link")
}

// ----- panel (Pterodactyl) -----
const pcfg = () => cfg().panel || {}
const panelReady = () => !isPlaceholder(pcfg().domain) && !isPlaceholder(pcfg().apikey)
async function pApi(method, p, body) {
    const c = pcfg()
    let res
    try {
        res = await axios({
            method, url: String(c.domain).replace(/\/+$/, "") + p, data: body, timeout: 30000, validateStatus: () => true,
            headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer " + c.apikey }
        })
    } catch (e) { throw new Error("Panel tidak bisa dihubungi") }
    const j = res.data
    if (res.status >= 400 || (j && j.errors)) throw new Error((j && j.errors && j.errors[0] && (j.errors[0].detail || j.errors[0].code)) || `Panel HTTP ${res.status}`)
    return j
}
async function usernameTaken(username) {
    const j = await pApi("GET", `/api/application/users?filter[username]=${encodeURIComponent(username)}`)
    return (j.data || []).some((x) => x.attributes && String(x.attributes.username).toLowerCase() === username)
}
const randPass = () => crypto.randomBytes(6).toString("base64").replace(/[^a-zA-Z0-9]/g, "x").slice(0, 10) + Math.floor(10 + Math.random() * 89)

async function deliverPanel(sock, rec) {
    if (!panelReady()) throw new Error("API panel Warung belum diisi (settings.js > global.warung.panel)")
    const c = pcfg()
    const username = rec.username
    if (!rec.pass) rec.pass = randPass()

    if (!rec.panelUserId) {
        const j = await pApi("POST", "/api/application/users", {
            email: `${username}@${c.emailDomain || "gmail.com"}`, username,
            first_name: username.charAt(0).toUpperCase() + username.slice(1) + " Server", last_name: "Server",
            language: "en", password: rec.pass
        })
        rec.panelUserId = j.attributes.id
    }
    if (!rec.panelServerId) {
        const egg = await pApi("GET", `/api/application/nests/${c.nestid}/eggs/${c.egg}`)
        const sv = await pApi("POST", "/api/application/servers", {
            name: username.charAt(0).toUpperCase() + username.slice(1) + " Server",
            description: wib(),
            user: rec.panelUserId,
            egg: parseInt(c.egg),
            docker_image: c.dockerImage || "ghcr.io/parkervcp/yolks:nodejs_20",
            startup: egg.attributes.startup,
            environment: c.environment || { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
            limits: { memory: rec.spec.ram, swap: 0, disk: rec.spec.disk, io: 500, cpu: rec.spec.cpu },
            feature_limits: { databases: 5, backups: 5, allocations: 5 },
            deploy: { locations: [parseInt(c.loc)], dedicated_ip: false, port_range: [] }
        })
        rec.panelServerId = sv.attributes.id
    }
    const notes = (c.catatan || [`Masa aktif ${hari()} hari`, "Simpan data ini, jangan dibagikan", "Garansi 15 hari (klaim sertakan bukti chat)"]).map((x) => `• ${x}`).join("\n")
    await sock.sendMessage(rec.chat, {
        text: `✅ *Panel aktif*\n\n🌐 Login    : ${c.domain}\n👤 Username : \`${username}\`\n🔐 Password : \`${rec.pass}\`\n\n💾 RAM ${gb(rec.spec.ram)} • 📀 Disk ${gb(rec.spec.disk)} • ⚙️ CPU ${cpuText(rec.spec.cpu)}\n\n${notes}`
    })
}

async function fulfill(sock, rec) {
    if (rec.busy) return
    rec.busy = true
    try {
        if (rec.type === "script") await deliverScript(sock, rec)
        else await deliverPanel(sock, rec)
        rec.status = "selesai"
        rec.doneAt = Date.now()
        rec.error = ""
        await notifyTransaction(sock, rec)
        notifyOwner(sock, `💰 *Order Warung selesai*\n${rec.productName} • ${rp(rec.price)}\n👤 ${rec.name || "-"} (${rec.sender.split("@")[0]})\n🧾 ${rec.id}`)
    } catch (e) {
        console.log("[Warung] pengiriman gagal:", e.message)
        rec.error = e.message
        rec.status = "lunas"
        if (!rec.failNotified) {
            rec.failNotified = true
            try { await sock.sendMessage(rec.chat, { text: `⚠️ Pembayaran *${rec.id}* sudah diterima, tapi pengiriman tertunda.\nOwner akan memprosesnya segera, tidak perlu bayar ulang.` }) } catch (_) {}
        }
        notifyOwner(sock, `⚠️ *Pengiriman gagal* ${rec.id}\n${rec.productName} • ${rp(rec.price)}\n👤 ${rec.name || "-"} (${rec.sender.split("@")[0]})\nPenyebab: ${e.message}\n\nBeres masalahnya lalu kirim ulang: *.kirimulang ${rec.id}*`)
    } finally { rec.busy = false }
}

// ===================== NOTIFIKASI SALURAN (TEKS SAJA) =====================
function buyerLabel(rec) {
    const num = String(rec.sender || "").endsWith("@s.whatsapp.net") ? rec.sender.split("@")[0] : ""
    const shown = num ? ((cfg().notif || {}).maskNomor === false ? num : maskNum(num)) : ""
    return `${rec.name || "Pembeli"}${shown ? ` (+${shown})` : ""}`
}
async function notifyTransaction(sock, rec) {
    const isPanel = rec.type === "panel"
    const detail = isPanel ? `💾 RAM : ${gb(rec.spec.ram)}\n` : `🏷️ Kategori : ${(findScript(rec.productId) || {}).kategori || "-"}\n`
    await toChannel(sock,
        `🛒 *TRANSAKSI ${isPanel ? "PANEL" : "SCRIPT"}*\n\n👤 Pembeli : ${buyerLabel(rec)}\n📦 Produk : ${rec.productName}\n${detail}💵 Harga : ${rp(rec.price)}\n🧾 Ref : ${rec.id}\n🕒 ${wib(rec.paidAt)}\n\n— ${toko()}`)
}

// ===================== POLLING =====================
let polling = false
async function pollTick() {
    if (polling || Date.now() < backoffUntil) return
    const sock = global.sock
    if (!sock || !sock.user) return
    polling = true
    try {
        const now = Date.now()
        const list = Object.values(store().orders).filter((o) => o.status === "menunggu").sort((a, b) => (a.lastCheck || 0) - (b.lastCheck || 0))
        let n = 0
        for (const rec of list) {
            if (n >= 3) break // batas gateway 120 request/menit
            if (now - (rec.lastCheck || 0) < 5000) continue
            n++
            rec.lastCheck = now
            await refresh(sock, rec).catch((e) => console.log("[Warung] cek bayar error:", e.message))
        }
    } finally { polling = false }
}

function resume(sock) {
    global.sock = sock
    try {
        for (const rec of Object.values(store().orders)) if (rec.status === "lunas" && !rec.busy) fulfill(sock, rec)
    } catch (e) { console.log("[Warung] resume error:", e.message) }
    if (!global.warungPoll) global.warungPoll = setInterval(pollTick, 3000)
}

// ===================== ORDER =====================
async function askUsername(sock, m, id) {
    const p = findPanel(id)
    if (!p) return reply(sock, m, "Paket tidak ditemukan.", [quickButton("🖥️ Lihat Paket", ".wr panel")])
    if (!panelReady()) {
        notifyOwner(sock, "⚠️ Ada yang mau order panel, tapi API panel Warung belum diisi (settings.js > global.warung.panel).")
        return reply(sock, m, "⚠️ Panel belum siap dijual. Hubungi owner.", [quickButton("👑 Owner", ".owner")])
    }
    userOf(m.sender).warungAwait = { t: "user", pid: id, at: Date.now() }
    await say(sock, m.chat, `🖥️ *${p.nama}* • ${rp(p.harga)}\n\n✍️ *Ketik username* untuk panelmu\nHuruf kecil/angka, 3-16 karakter. Contoh: budi123`,
        [quickButton("❌ Batal", ".start")], { quoted: m })
}

async function usernameStep(sock, m, a, body) {
    const u = userOf(m.sender)
    const username = body.trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9_]{1,14}[a-z0-9]$/.test(username)) {
        u.warungAwait = { ...a, at: Date.now() }
        return reply(sock, m, "Username tidak valid. Pakai huruf kecil/angka (boleh _), 3-16 karakter. Ketik lagi ya.")
    }
    u.warungAwait = null
    const p = findPanel(a.pid)
    if (!p) return reply(sock, m, "Paket tidak ditemukan.", [quickButton("🖥️ Lihat Paket", ".wr panel")])
    try {
        if (await usernameTaken(username)) {
            u.warungAwait = { ...a, at: Date.now() }
            return reply(sock, m, `Username *${username}* sudah dipakai. Ketik username lain ya.`)
        }
    } catch (e) {
        console.log("[Warung] cek username gagal:", e.message)
        notifyOwner(sock, `⚠️ API panel Warung bermasalah: ${e.message}`)
        return reply(sock, m, "⚠️ Panel lagi tidak bisa dihubungi. Coba lagi nanti, kamu belum dikenai tagihan.")
    }
    return startPayment(sock, m, "panel", p, { username })
}

async function buyScript(sock, m, id) {
    const s = findScript(id)
    if (!s) return reply(sock, m, "Script tidak ditemukan.", [quickButton("🧩 Lihat Script", ".wr script")])
    return startPayment(sock, m, "script", s)
}

async function checkOrder(sock, m, id) {
    const rec = store().orders[id]
    if (!rec || rec.sender !== m.sender) return reply(sock, m, "Pesanan tidak ditemukan.")
    if (rec.status === "menunggu") {
        rec.lastCheck = Date.now()
        await refresh(sock, rec)
        if (rec.status === "menunggu") {
            return say(sock, m.chat, `⏳ Tagihan *${rec.id}* belum dibayar.\n💳 Total *${rp(rec.total)}*\n⏱️ Batas ${wib(rec.expiresAt)}`,
                [urlButton("💳 Halaman Bayar", rec.payUrl), quickButton("🔄 Cek Lagi", `.wr c ${rec.id}`), quickButton("❌ Batalkan", `.wr x ${rec.id}`)], { quoted: m })
        }
        return
    }
    return reply(sock, m, `🧾 *${rec.id}*\n${rec.productName} • ${rp(rec.price)}\nStatus: ${STATUS[rec.status] || rec.status}`, [quickButton("🏠 Beranda", ".start")])
}

async function cancelOrder(sock, m, id) {
    const rec = store().orders[id]
    if (!rec || rec.sender !== m.sender) return reply(sock, m, "Pesanan tidak ditemukan.")
    if (rec.status !== "menunggu") return reply(sock, m, `Pesanan ini sudah ${STATUS[rec.status] || rec.status}, tidak bisa dibatalkan.`)
    try { await Gw.cancel(rec.ref) } catch (e) {
        if (e.code === "already_paid") { await refresh(sock, rec); return }
        if (e.code !== "not_found") return reply(sock, m, `⚠️ ${gwFailText(e)}`)
    }
    rec.status = "dibatalkan"
    rec.closedAt = Date.now()
    return reply(sock, m, `🚫 Tagihan *${rec.id}* dibatalkan.`, [quickButton("🏠 Beranda", ".start")])
}

// ===================== OWNER =====================
function findDoc(m) {
    for (const c of [m.msg, m.quoted]) {
        if (!c) continue
        const d = (c.message && c.message.documentMessage) || c
        if (d && (d.url || d.directPath) && (d.fileName || /application/i.test(d.mimetype || ""))) return d
    }
    return null
}
const safeName = (s) => String(s || "file").replace(/[^\w.\-]+/g, "_").slice(0, 60)
const num = (s) => parseInt(String(s || "").replace(/\D/g, ""), 10) || 0

// Warung menjual nokos + pembayaran lewat gateway, jadi dua API key welper wajib ada & valid
async function apiProblems() {
    const out = []
    if (!Gw.hasKey()) out.push({ nama: "Gateway pembayaran", alasan: "belum diisi", cara: ".setgateway key gwk_xxx atau settings.js > global.warung.gateway.apiKey" })
    else {
        try { await Gw.me() } catch (e) {
            if (["unauthorized", "account_locked"].includes(e.code) || e.status === 401 || e.status === 403) out.push({ nama: "Gateway pembayaran", alasan: e.code === "account_locked" ? "akunnya dikunci admin" : "tidak valid / ditolak server", cara: ".setgateway key gwk_xxx atau settings.js > global.warung.gateway.apiKey" })
        }
    }
    const nk = await require("./Nokos.js").keyProblem()
    if (nk) out.push({ nama: "Nokos", alasan: nk, cara: "settings.js > global.nokos.apiKey (lalu restart bot)" })
    return out
}

async function settingMenu(sock, m) {
    const s = st(), w = store()
    const body = `⚙️ *Setting Warung*\n\n🏪 Mode : *${s.mode ? "ON" : "OFF"}*\n💳 Gateway : ${Gw.hasKey() ? "terisi" : "BELUM diisi"}\n🖥️ API panel : ${panelReady() ? "terisi" : "BELUM diisi"}\n📢 Saluran : ${channelId() || "-"}\n📦 Produk : ${panelProducts().length} panel • ${scriptProducts().length} script\n\n✨ _Pilih menu lewat tombol_`
    await say(sock, m.chat, body, [listSections("⚙️ Menu Setting", [
        {
            title: "Umum", rows: [
                { title: s.mode ? "🔴 Matikan Warung" : "🟢 Hidupkan Warung", description: "Mode warung ON / OFF", id: `.modewarung ${s.mode ? "off" : "on"}` },
                { title: "💳 Cek Gateway", description: "Tes koneksi & saldo", id: ".cekgateway" },
                { title: "🔑 Setting Gateway", description: "API key & penanggung fee", id: ".setgateway" },
                { title: "📢 Saluran Notif", description: "ID saluran notifikasi", id: ".setchwarung" },
                { title: "🧪 Tes Notif", description: "Kirim tes ke saluran", id: ".tesnotifwarung" },
                { title: "🏷️ Nama Warung", description: "Nama toko di tampilan", id: ".setnamawarung" },
                { title: "🧾 Order Terakhir", description: "10 pesanan terbaru", id: ".orderwarung" }
            ]
        },
        {
            title: "Produk", rows: [
                { title: "📦 Daftar Produk", description: "Semua panel & script", id: ".listproduk" },
                { title: "➕ Tambah Panel", description: "Produk panel baru", id: ".addpanel" },
                { title: "➕ Tambah Script", description: "Produk script (zip/link)", id: ".addscript" },
                { title: "💲 Atur Harga", description: "Ubah harga produk", id: ".setharga" },
                { title: "🗑️ Hapus Produk", description: "Hapus produk buatan", id: ".delproduk" }
            ]
        }
    ])], { quoted: m })
}

async function ownerCmd(sock, m, command, args) {
    const s = st(), w = store()
    const text = args.join(" ").trim()

    if (command === "settingwarung") return settingMenu(sock, m)

    if (command === "modewarung") {
        const v = (args[0] || "").toLowerCase()
        if (!["on", "off"].includes(v)) return reply(sock, m, `Mode warung sekarang: *${s.mode ? "ON" : "OFF"}*\n\n.modewarung on\n.modewarung off`)
        if (v === "on") {
            const masalah = await apiProblems()
            if (masalah.length) {
                s.mode = false
                return reply(sock, m, `🔒 *Warung belum bisa diaktifkan*\n\n${masalah.map((x) => `❌ ${x.nama}: API key ${x.alasan}`).join("\n")}\n\nDaftar / login di https://www.welper.web.id lalu ambil API key di menu Developer:\n${masalah.map((x) => `• ${x.nama} → ${x.cara}`).join("\n")}\n\nSetelah terisi, ketik *.modewarung on* lagi.`)
            }
        }
        s.mode = v === "on"
        return reply(sock, m, s.mode
            ? `✅ *Warung ON*\nNokos ikut aktif (semua fitur jualan ON)\n💳 Gateway: ${Gw.hasKey() ? "terisi" : "BELUM diisi"}\n🖥️ API panel: ${panelReady() ? "terisi" : "BELUM diisi"}`
            : "✅ *Warung OFF*")
    }

    if (command === "listproduk") {
        const P = panelProducts(), C = scriptProducts()
        return reply(sock, m, `🖥️ *Panel*\n${P.map((p) => `• ${p.id} — ${p.nama} — ${rp(p.harga)}`).join("\n") || "-"}\n\n🧩 *Script*\n${C.map((c) => `• ${c.id} — ${c.nama} — ${rp(c.harga)} — ${c.kategori || "Lainnya"}${c.fromSettings ? " (settings.js)" : ""}`).join("\n") || "-"}`)
    }

    if (command === "addpanel") {
        const [nama, ram, disk, cpu, harga] = text.split("|").map((x) => x.trim())
        if (!nama || !harga) return reply(sock, m, "➕ *Tambah Panel*\n\nFormat:\n.addpanel Nama | RAM GB | Disk GB | CPU % | Harga\n\nContoh:\n.addpanel Panel 15 GB | 15 | 8 | 300 | 25000\n\nRAM 0 = unlimited.")
        const hg = num(harga)
        if (hg < 1000) return reply(sock, m, "Harga minimal Rp1.000.")
        const p = { id: `c${++w.seq}`, nama: cut(nama, 30), ram: String(num(ram) * 1000), disk: String(num(disk) * 1000), cpu: String(num(cpu)), harga: hg }
        w.panels.push(p)
        return reply(sock, m, `✅ Panel ditambah\n🆔 ${p.id} • ${p.nama}\n💾 ${gb(p.ram)} • 📀 ${gb(p.disk)} • ⚙️ ${cpuText(p.cpu)}\n💵 ${rp(p.harga)}`)
    }

    if (command === "addscript") {
        const [nama, harga, kategori, deskripsi, link] = text.split("|").map((x) => x.trim())
        const usage = "➕ *Tambah Script*\n\nFormat:\n.addscript Nama | Harga | Kategori | Deskripsi\n\nFile zip: kirim zipnya, lalu *reply* file itu dengan perintah di atas.\nAtau pakai link di akhir:\n.addscript Nama | Harga | Kategori | Deskripsi | https://link"
        if (!nama || !harga) return reply(sock, m, usage)
        const hg = num(harga)
        if (hg < 1000) return reply(sock, m, "Harga minimal Rp1.000.")
        const sc = { id: `s${++w.seq}`, nama: cut(nama, 40), harga: hg, kategori: cut(kategori || "Lainnya", 24), deskripsi: cut(deskripsi || "", 400), file: "", fileName: "", link: "" }
        const d = findDoc(m)
        if (d) {
            try {
                const buf = await sock.downloadMediaMessage(d, "document")
                if (!buf || !buf.length) throw new Error("file kosong")
                fs.mkdirSync(FILE_DIR, { recursive: true })
                sc.fileName = safeName(d.fileName || `${sc.nama}.zip`)
                sc.file = path.join("storage", "warung", `${sc.id}_${sc.fileName}`)
                fs.writeFileSync(path.join(ROOT, sc.file), buf)
            } catch (e) { w.seq--; return reply(sock, m, `⚠️ Gagal mengunduh file: ${e.message}`) }
        } else if (/^https?:\/\//i.test(link || "")) sc.link = link
        else { w.seq--; return reply(sock, m, `File / link belum ada.\n\n${usage}`) }
        w.scripts.push(sc)
        return reply(sock, m, `✅ Script ditambah\n🆔 ${sc.id} • ${sc.nama}\n🏷️ ${sc.kategori}\n💵 ${rp(sc.harga)}\n📎 ${sc.file ? `${sc.fileName} (${Math.round(fs.statSync(path.join(ROOT, sc.file)).size / 1024)} KB)` : sc.link}`)
    }

    if (command === "setharga") {
        const id = (args[0] || "").toLowerCase()
        if (!id || args[1] === undefined) return reply(sock, m, "💲 *Atur Harga*\n\n.setharga <id> <harga>\n.setharga reset <id>\n\nContoh:\n.setharga 2gb 6000\n.setharga s3 50000\n\nHarga 0 = produk disembunyikan. Lihat id di .listproduk")
        if (id === "reset") { delete w.price[(args[1] || "").toLowerCase()]; return reply(sock, m, "✅ Harga dikembalikan ke settings.js") }
        const hg = num(args[1])
        if (hg !== 0 && hg < 1000) return reply(sock, m, "Harga minimal Rp1.000 (atau 0 untuk menyembunyikan).")
        if (TIERS.includes(id)) { w.price[id] = hg; return reply(sock, m, `✅ Harga ${id} sekarang ${hg ? rp(hg) : "disembunyikan"}`) }
        const t = w.panels.find((x) => x.id === id) || w.scripts.find((x) => x.id === id)
        if (t) { t.harga = hg; return reply(sock, m, `✅ Harga ${t.nama} sekarang ${hg ? rp(hg) : "disembunyikan"}`) }
        if (scriptProducts().some((x) => x.id === id) || (cfg().produkScript || []).some((x) => x.id === id)) return reply(sock, m, "Script ini dari settings.js, ubah harganya langsung di file itu.")
        return reply(sock, m, "ID produk tidak ditemukan. Lihat .listproduk")
    }

    if (command === "delproduk") {
        const id = (args[0] || "").toLowerCase()
        if (!id) return reply(sock, m, "🗑️ *Hapus Produk*\n\n.delproduk <id>\nLihat id di .listproduk\n\n(Paket 1GB-unlimited bawaan: pakai .setharga <id> 0)")
        let i = w.panels.findIndex((x) => x.id === id)
        if (i >= 0) { const [d] = w.panels.splice(i, 1); return reply(sock, m, `✅ ${d.nama} dihapus.`) }
        i = w.scripts.findIndex((x) => x.id === id)
        if (i >= 0) {
            const [d] = w.scripts.splice(i, 1)
            const inUse = Object.values(w.orders).some((o) => ["menunggu", "lunas"].includes(o.status) && o.deliver && o.deliver.file === d.file)
            if (d.file && !inUse) { try { fs.unlinkSync(path.join(ROOT, d.file)) } catch (e) {} }
            return reply(sock, m, `✅ ${d.nama} dihapus.`)
        }
        return reply(sock, m, TIERS.includes(id) ? "Paket bawaan tidak dihapus. Pakai .setharga " + id + " 0 untuk menyembunyikan." : "ID produk tidak ditemukan. Lihat .listproduk")
    }

    if (command === "setnamawarung") {
        if (!text) return reply(sock, m, `Nama warung sekarang: *${toko()}*\n\n.setnamawarung <nama baru>\n.setnamawarung reset`)
        s.namaToko = text === "reset" ? "" : text.slice(0, 40)
        return reply(sock, m, `✅ Nama warung: *${toko()}*`)
    }

    if (command === "setchwarung") {
        if (!text) return reply(sock, m, `Saluran notif warung: ${s.channelId || "-"}${s.channelId ? "" : `\n(kosong = ikut saluran nokos: ${channelId() || "-"})`}\n\n.setchwarung 1203xxxx@newsletter\n.setchwarung https://whatsapp.com/channel/xxxx\n.setchwarung reset`)
        if (text === "reset") { s.channelId = ""; return reply(sock, m, "✅ Saluran warung dihapus (ikut saluran nokos).") }
        let id = text
        const link = text.match(/whatsapp\.com\/channel\/([\w-]+)/i)
        if (link) {
            try { id = (await sock.newsletterMetadata("invite", link[1])).id } catch (e) { return reply(sock, m, "Gagal baca link saluran. Pakai ID berakhiran @newsletter (cek lewat .cekidch).") }
        }
        if (!/@(newsletter|g\.us)$/.test(id)) return reply(sock, m, "ID harus berakhiran @newsletter (saluran) atau @g.us (grup).")
        s.channelId = id
        return reply(sock, m, `✅ Saluran notif warung:\n${id}\n\nCoba *.tesnotifwarung*`)
    }

    if (command === "tesnotifwarung") {
        if (!channelId()) return reply(sock, m, "Belum ada saluran. Pakai .setchwarung dulu.")
        const ok = await toChannel(sock, `🧪 *TES NOTIFIKASI*\n\n👤 Pembeli : ${m.pushName || "Owner"} (+6281****890)\n📦 Produk : Panel 2 GB\n💾 RAM : 2 GB\n💵 Harga : ${rp(5000)}\n🧾 Ref : WRTEST\n🕒 ${wib()}\n\n— ${toko()}`)
        return reply(sock, m, ok ? `✅ Tes terkirim ke ${channelId()}` : "❌ Gagal kirim. ID salah / bot bukan admin saluran.")
    }

    if (command === "setgateway") {
        const [k, ...rest] = args
        const v = rest.join(" ").trim()
        if (k === "key" && v) { s.gwApiKey = v; return reply(sock, m, "✅ API key gateway disimpan (menimpa settings.js).\nHapus pesan tadi biar aman. Cek dengan .cekgateway") }
        if (k === "fee" && ["customer", "merchant"].includes(v)) { s.feeBearer = v; return reply(sock, m, `✅ Fee ditanggung: *${v === "customer" ? "pembeli" : "kamu (dipotong dari saldo)"}*`) }
        if (k === "reset") { s.gwApiKey = ""; s.feeBearer = ""; return reply(sock, m, "✅ Kembali ke pengaturan settings.js") }
        return reply(sock, m, `🔑 *Setting Gateway*\n\nAPI key : ${Gw.hasKey() ? "terisi" : "BELUM"}\nFee ditanggung : ${feeBearer() === "customer" ? "pembeli" : "kamu"}\n\n.setgateway key gwk_xxxx\n.setgateway fee customer\n.setgateway fee merchant\n.setgateway reset\n\nAtau isi di settings.js > global.warung.gateway`)
    }

    if (command === "cekgateway") {
        const out = []
        try { await Gw.ping(); out.push("✅ Gateway terhubung") } catch (e) { out.push(`❌ Gateway: ${e.message}`) }
        if (Gw.hasKey()) {
            try { const b = (await Gw.balance()).data; out.push(`💼 Saldo ${rp(b.balance)}\n✅ Aktif ${rp(b.active)} • ⏳ Tertunda ${rp(b.pending)}`) } catch (e) { out.push(`❌ API key: ${e.message}`) }
        } else out.push("🔑 API key belum diisi")
        out.push(`🖥️ API panel: ${panelReady() ? "terisi" : "belum diisi"}`)
        return reply(sock, m, out.join("\n"))
    }

    if (command === "orderwarung") {
        const list = Object.values(w.orders).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)
        if (!list.length) return reply(sock, m, "Belum ada order.")
        return reply(sock, m, `🧾 *Order Terakhir*\n\n${list.map((o) => `• ${o.id}\n  ${o.productName} • ${rp(o.price)} • ${STATUS[o.status] || o.status}\n  ${o.name || "-"} (${o.sender.split("@")[0]}) • ${wib(o.createdAt)}${o.error ? `\n  ⚠️ ${o.error}` : ""}`).join("\n\n")}`)
    }

    if (command === "kirimulang") {
        const rec = w.orders[(args[0] || "").toUpperCase()] || w.orders[args[0]]
        if (!rec) return reply(sock, m, "Pakai: .kirimulang <id order>\nLihat id di .orderwarung")
        if (rec.status !== "lunas") return reply(sock, m, `Order ini statusnya ${STATUS[rec.status] || rec.status}, tidak perlu dikirim ulang.`)
        rec.failNotified = false
        await fulfill(sock, rec)
        return reply(sock, m, rec.status === "selesai" ? `✅ ${rec.id} terkirim.` : `⚠️ Masih gagal: ${rec.error}`)
    }
}

// ===================== PINTU MASUK =====================
const USER_CMDS = new Set(["start", "warung", "wr", "cekpesanan"])
const OWNER_CMDS = new Set(["modewarung", "settingwarung", "addpanel", "addscript", "setharga", "delproduk", "listproduk", "setchwarung", "setnamawarung", "setgateway", "cekgateway", "tesnotifwarung", "orderwarung", "kirimulang"])

async function handle({ sock, m, command, args, isOwner }) {
    if (OWNER_CMDS.has(command)) {
        if (!isOwner) { await reply(sock, m, global.mess?.owner || "Fitur ini hanya untuk ownerbot."); return true }
        await ownerCmd(sock, m, command, args)
        return true
    }
    if (!USER_CMDS.has(command)) return false
    if (command === "start" && !modeOn()) return false // mode warung mati: .start tetap milik nokos
    if (m.isGroup) {
        if (!modeOn()) await reply(sock, m, "Warung hanya bisa lewat chat pribadi bot ya 🙏")
        return true
    }
    if (!modeOn() && !isOwner) { await reply(sock, m, "🏪 Warung sedang tutup. Coba lagi nanti ya."); return true }
    userOf(m.sender)
    const [act, a] = args
    if (command === "start" || command === "warung") { await showHome(sock, m, isOwner); return true }
    if (command === "cekpesanan") { await myOrders(sock, m); return true }
    // command === "wr"
    if (act !== "bp") userOf(m.sender).warungAwait = null
    if (act === "panel") await panelPage(sock, m)
    else if (act === "script") await scriptPage(sock, m)
    else if (act === "p") await panelDetail(sock, m, a)
    else if (act === "s") await scriptDetail(sock, m, a)
    else if (act === "bp") await askUsername(sock, m, a)
    else if (act === "bs") await buyScript(sock, m, a)
    else if (act === "c") await checkOrder(sock, m, a)
    else if (act === "x") await cancelOrder(sock, m, a)
    else if (act === "o") await myOrders(sock, m)
    else await showHome(sock, m, isOwner)
    return true
}

// pesan biasa (bukan command) di chat pribadi
//  phase "await": jawaban untuk pertanyaan bot (username panel)
//  phase "home" : Warung ON & Nokos OFF -> chat apa pun diarahkan ke halaman awal
async function handleText({ sock, m, isOwner, phase }) {
    if (m.isGroup || m.fromMe) return false
    const body = String(m.body || "").trim()
    if (!body) return false
    if (phase === "await") {
        const u = userOf(m.sender)
        const a = u.warungAwait
        if (!a) return false
        if (Date.now() - a.at > 5 * 60000) { u.warungAwait = null; return false }
        if (a.t === "user") { await usernameStep(sock, m, a, body); return true }
        return false
    }
    if (!modeOn() || isOwner) return false
    return showHome(sock, m, isOwner)
}

module.exports = { handle, handleText, showHome, resume, modeOn, USER_CMDS, OWNER_CMDS, _internal: { store, st, panelProducts, scriptProducts, refresh, fulfill, startPayment, pollTick } }
