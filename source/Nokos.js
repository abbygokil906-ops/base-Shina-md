/*
  Nokos — fitur jual nomor OTP (Nokoskuy API v2) untuk Fuyuha Shina MD.

  - Kategori menu "Nokos" + mode khusus: .nokosmode on/off
  - Saldo per pengguna di bot, deposit via QRIS (lewat API deposit Nokoskuy)
  - Margin keuntungan order & admin QR diatur di settings.js (global.nokos)
  - Notifikasi transaksi + struk foto ke saluran (ID saluran diatur owner)
  - Broadcast maintenance ke saluran tiap 12.00 siang & 12.00 malam (WIB), lengkap foto + tombol
*/
const axios = require("axios")
const Api = require("./NokosApi.js")
const Img = require("./NokosImg.js")
const Button = require("./Button.js")
const { sendNative, urlButton, quickButton, listButton } = Button

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const cfg = () => global.nokos || {}

// ===================== STATE & SETTING =====================
function store() {
    const d = global.db
    if (!d.nokos || typeof d.nokos !== "object") d.nokos = {}
    const n = d.nokos
    if (!n.orders) n.orders = {}
    if (!n.deposits) n.deposits = {}
    if (typeof n.lastSlot !== "string") n.lastSlot = ""
    if (n.maint === undefined) n.maint = null
    return n
}
function st() {
    const s = global.db.settings
    if (!s.nokos || typeof s.nokos !== "object") s.nokos = {}
    const n = s.nokos
    if (typeof n.mode !== "boolean") n.mode = false
    if (typeof n.channelId !== "string") n.channelId = ""
    if (typeof n.namaToko !== "string") n.namaToko = ""
    if (typeof n.namaOwner !== "string") n.namaOwner = ""
    return n
}
const toko = () => st().namaToko || cfg().namaToko || global.namaBot || "NOKOS STORE"
const ownerName = () => st().namaOwner || cfg().namaOwner || global.namaOwner || "Owner"
const website = () => cfg().websiteUrl || "https://www.welper.web.id"
const modeOn = () => { try { return !!st().mode } catch { return false } }
// notifikasi saluran & maintenance ikut aktif kalau Mode Warung ON (nokos ikut dijual lewat warung)
const warungSt = () => (global.db && global.db.settings && global.db.settings.warung) || {}
const notifActive = () => !!(st().mode || warungSt().mode)
const notifChannel = () => st().channelId || warungSt().channelId || ""

function userOf(jid) {
    if (!global.db.users[jid] || typeof global.db.users[jid] !== "object") global.db.users[jid] = {}
    const u = global.db.users[jid]
    if (typeof u.nokosSaldo !== "number") u.nokosSaldo = 0
    return u
}

// ===================== HARGA / MARGIN =====================
const marginOrder = (apiPrice) =>
    Math.max(0, Math.round((Number(cfg().marginOrder) || 0) + (apiPrice * (Number(cfg().marginOrderPersen) || 0)) / 100))
const marginQr = () => Math.max(0, Math.round(Number(cfg().marginQr) || 0))
const sellPrice = (apiPrice) => { const p = Number(apiPrice) || 0; return p + marginOrder(p) }

// ===================== FORMAT =====================
const rp = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID")
const wib = (ts) =>
    new Date(ts || Date.now())
        .toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
        .replace(/\./g, ":") + " WIB"
function jakarta() {
    const p = Object.fromEntries(
        new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
            .formatToParts(new Date()).map((x) => [x.type, x.value])
    )
    return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) }
}
const maskNum = (s) => {
    const d = String(s || "").replace(/\D/g, "")
    if (d.length < 8) return d || "-"
    return d.slice(0, 4) + "*".repeat(Math.max(3, d.length - 7)) + d.slice(-3)
}
const botJid = (sock) => (sock.decodeJid ? sock.decodeJid(sock.user.id) : String(sock.user.id).split(":")[0] + "@s.whatsapp.net")
const botNum = (sock) => String(sock.user.id).split(":")[0].split("@")[0]
const waLink = (sock, text) => `https://wa.me/${botNum(sock)}?text=${encodeURIComponent(text)}`
const copyButton = (text, code) => ({ name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: text, copy_code: String(code) }) })
const S = (fallback) => global.sock || fallback
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout ${ms / 1000} detik`)), ms))])

// ===================== KIRIM PESAN =====================
async function say(sock, jid, body, buttons, { footer, image, quoted } = {}) {
    try {
        return await sendNative(
            sock, jid,
            { body, footer: footer || `© ${toko()}`, buttons, image: image || null },
            { userJid: botJid(sock), ...(quoted ? { quoted } : {}) }
        )
    } catch (e) {
        console.log("[Nokos] kirim tombol gagal, kirim teks biasa:", e.message)
        return sock.sendMessage(jid, { text: body }, quoted ? { quoted } : {})
    }
}

// notifikasi ke saluran: TEKS SAJA (tanpa foto & tombol)
async function sendChannelText(sock, jid, text) {
    await withTimeout(sock.sendMessage(jid, { text }), 30000, "kirim teks")
    return "teks"
}

// ===================== PROVIDER / SERVER =====================
let provCache = { at: 0, list: [] }
async function listProviders(force) {
    if (!force && Date.now() - provCache.at < 30000 && provCache.list.length) return provCache.list
    let list
    try {
        const res = await Api.providers()
        const arr = Array.isArray(res.data) ? res.data : Object.values(res.data || {})
        list = arr.map((p, i) => {
            const key = p.id || p.provider || p.key || p.value || `provider_${i + 1}`
            const status = String(p.status ?? "")
            const active = p.active === true || /^active$/i.test(status) || (p.active === undefined && !status)
            return { key, name: p.name || p.label || `Server ${String(key).replace(/\D/g, "") || i + 1}`, active }
        })
    } catch (e) {
        list = Array.from({ length: Number(cfg().jumlahServer) || 7 }, (_, i) => ({ key: `provider_${i + 1}`, name: `Server ${i + 1}`, active: true }))
    }
    provCache = { at: Date.now(), list }
    return list
}

// ===================== MENU HUB =====================
function userStats(jid) {
    const list = Object.values(store().orders).filter((r) => r.sender === jid)
    const sukses = list.filter((r) => r.success).length
    const gagal = list.filter((r) => !r.success && r.userRefunded).length
    return { total: list.length, sukses, gagal, deposit: userOf(jid).nokosDeposit || 0 }
}

async function hub(sock, m, isOwner) {
    const u = userOf(m.sender)
    const stt = userStats(m.sender)
    const nama = m.pushName || "Kak"
    const body =
        `Halo *${nama}* 👋\nSelamat datang di *${toko()}*\n\n` +
        `╭─「 👤 *PROFIL KAMU* 」\n` +
        `│ 🙍 Nama      : ${nama}\n` +
        `│ 🏷️ Status    : ${isOwner ? "Owner" : "Member"}\n` +
        `│ 💰 Saldo     : *${rp(u.nokosSaldo)}*\n` +
        `│ ➕ Total deposit : ${rp(stt.deposit)}\n` +
        `│ 🧾 Total transaksi : ${stt.total}\n` +
        `│ ✅ Total sukses : ${stt.sukses}\n` +
        `│ ❌ Total gagal  : ${stt.gagal}\n` +
        `╰──────────────⦁\n\n` +
        `🔄 OTP tidak masuk = saldo kembali otomatis\n✨ _Pilih kategori lewat tombol di bawah_`
    const rows = [
        { title: "🛒 Order Nokos", description: "Pilih layanan, server, negara", id: ".ordernokos" },
        { title: "➕ Deposit Saldo", description: "Isi saldo lewat QRIS", id: ".depositnokos" },
        { title: "💰 Saldo & Statistik", description: "Ringkasan akun kamu", id: ".saldonokos" },
        { title: "📜 Riwayat Order", description: "5 order terakhir", id: ".riwayatnokos" },
        { title: "📡 Status Server", description: "Cek server 1 sampai 7", id: ".statusserver" }
    ]
    await say(sock, m.chat, body, [
        listButton("📂 Kategori", `© ${toko()}`, rows),
        quickButton("🛒 Order Nokos", ".ordernokos"),
        quickButton("➕ Deposit", ".depositnokos"),
        urlButton("📢 Saluran", global.linkChannel || website()),
        quickButton("👑 Owner", ".owner")
    ], { image: global.thumbnail, quoted: m })
}

// ===================== ALUR ORDER (pilih layanan -> server -> negara -> penawaran) =====================
const svcNames = new Map()
const countryNames = new Map()

let svcAll = { at: 0, list: [] }
async function allServices() {
    if (Date.now() - svcAll.at < 5 * 60000 && svcAll.list.length) return svcAll.list
    const res = await Api.services()
    const list = (res.data || []).filter((x) => x.stock > 0).sort((a, b) => b.stock - a.stock)
    list.forEach((x) => svcNames.set(x.id, x.name))
    svcAll = { at: Date.now(), list }
    return list
}

const PAGE = 8
async function serviceList(sock, m, page = 1, q = "") {
    let list
    try { list = q ? ((await Api.services(q)).data || []).filter((x) => x.stock > 0) : await allServices() } catch (e) { return apiFail(sock, m, e) }
    if (!list.length) return reply(sock, m, q ? `Layanan *${q}* tidak ditemukan / stok kosong.` : "Belum ada layanan tersedia.", [quickButton("🔍 Cari Lagi", ".nks q"), quickButton("📋 Semua Layanan", ".ordernokos"), quickButton("🏠 Beranda", ".start")])
    list.forEach((x) => svcNames.set(x.id, x.name))
    const pages = Math.max(1, Math.ceil(list.length / PAGE))
    page = Math.min(Math.max(1, page), pages)
    const slice = list.slice((page - 1) * PAGE, page * PAGE)
    const rows = slice.map((x) => ({ title: x.name, description: `Stok ${x.stock} • mulai ${rp(sellPrice(x.price_from))}`, id: `.nks s ${x.id}` }))
    if (!q && page > 1) rows.push({ title: "⬅️ Halaman sebelumnya", description: `Hal ${page - 1} dari ${pages}`, id: `.nks p ${page - 1}` })
    if (!q && page < pages) rows.push({ title: "➡️ Halaman berikutnya", description: `Hal ${page + 1} dari ${pages}`, id: `.nks p ${page + 1}` })
    return say(sock, m.chat, `🛒 *Pilih Layanan*${q ? ` (hasil "${q}")` : ""}\n\n📄 Halaman ${page}/${pages} • ${list.length} layanan tersedia\n✨ _Tekan tombol di bawah_`, [
        listButton("📲 Pilih layanan", `© ${toko()}`, rows),
        quickButton("🔍 Cari Layanan", ".nks q"),
        ...(!q && page < pages ? [quickButton("➡️ Berikutnya", `.nks p ${page + 1}`)] : []),
        ...(q ? [quickButton("📋 Semua Layanan", ".ordernokos")] : []),
        quickButton("🏠 Beranda", ".start")
    ], { quoted: m })
}

async function orderStart(sock, m, args) {
    return serviceList(sock, m, 1, args.join(" ").trim())
}

async function pickServer(sock, m, sid) {
    const list = (await listProviders()).filter((p) => p.active)
    if (!list.length) return reply(sock, m, "Semua server sedang gangguan. Coba lagi nanti ya.")
    const rows = list.map((p) => ({ title: `📡 ${p.name}`, description: "Server aktif", id: `.nks c ${sid} ${p.key}` }))
    return say(sock, m.chat, `🖥️ *${svcNames.get(sid) || "Layanan"}*\nPilih server (stok & harga bisa beda tiap server):`, [
        listButton("📡 Pilih server", `© ${toko()}`, rows)
    ], { quoted: m })
}

async function pickCountry(sock, m, sid, prov) {
    let res
    try { res = await Api.countries(sid, prov) } catch (e) { return apiFail(sock, m, e) }
    const list = (res.data || []).filter((c) => c.stock > 0).sort((a, b) => a.price - b.price).slice(0, 10)
    if (!list.length) return reply(sock, m, "Stok server ini kosong. Coba server lain ya.", [quickButton("📡 Pilih server lain", `.nks s ${sid}`)])
    list.forEach((c) => countryNames.set(c.country_code, c.name))
    const rows = list.map((c) => ({ title: `${c.name} • ${rp(sellPrice(c.price))}`, description: `Stok ${c.stock}`, id: `.nks o ${sid} ${prov} ${c.country_code}` }))
    return say(sock, m.chat, `🌍 Pilih negara / wilayah:`, [listButton("🌍 Pilih negara", `© ${toko()}`, rows)], { quoted: m })
}

async function pickOffer(sock, m, sid, prov, cc) {
    let res
    try { res = await Api.offers(sid, prov, cc) } catch (e) { return apiFail(sock, m, e) }
    const list = (res.data || []).filter((o) => o.stock > 0)
    if (!list.length) return reply(sock, m, "Stok habis. Coba server atau negara lain.", [quickButton("📡 Pilih server lain", `.nks s ${sid}`)])
    if (list.length === 1) return confirmBuy(sock, m, sid, prov, cc, list[0].provider_id)
    const rows = list.map((o) => ({
        title: `${o.server_label || o.provider_id} • ${rp(sellPrice(o.price))}`,
        description: `Stok ${o.stock}${o.recommended ? " • Rekomendasi" : ""}`,
        id: `.nks k ${sid} ${prov} ${cc} ${o.provider_id}`
    }))
    return say(sock, m.chat, `⚙️ Pilih opsi server:`, [listButton("⚙️ Pilih opsi", `© ${toko()}`, rows)], { quoted: m })
}

async function confirmBuy(sock, m, sid, prov, cc, pid) {
    let offer
    try { offer = await findOffer(sid, prov, cc, pid) } catch (e) { return apiFail(sock, m, e) }
    if (!offer || offer.stock <= 0) return reply(sock, m, "Stok baru saja habis. Coba pilihan lain.", [quickButton("🛒 Order lagi", ".ordernokos")])
    const price = sellPrice(offer.price)
    const saldo = userOf(m.sender).nokosSaldo
    const body =
        `🧾 *Konfirmasi Order*\n\n` +
        `📲 Layanan : ${svcNames.get(sid) || "Layanan"}\n📡 Server  : ${(await serverName(prov))}${offer.server_label ? ` (${offer.server_label})` : ""}\n` +
        `🌍 Negara  : ${countryNames.get(cc) || cc}\n💵 Harga   : *${rp(price)}*\n💰 Saldo   : ${rp(saldo)}\n\n` +
        (saldo < price ? `⚠️ Saldo kurang ${rp(price - saldo)}. Deposit dulu ya.` : `Tekan *Beli Sekarang* untuk lanjut. Nomor langsung dikirim.`)
    const buttons = saldo < price
        ? [quickButton("➕ Deposit Saldo", ".depositnokos"), quickButton("❌ Batal", ".start")]
        : [quickButton("✅ Beli Sekarang", `.nks b ${sid} ${prov} ${cc} ${pid}`), quickButton("❌ Batal", ".start")]
    return say(sock, m.chat, body, buttons, { quoted: m })
}

async function findOffer(sid, prov, cc, pid) {
    const res = await Api.offers(sid, prov, cc)
    return (res.data || []).find((o) => o.provider_id === pid)
}
async function serverName(prov) {
    const p = (await listProviders()).find((x) => x.key === prov)
    return p ? p.name : prov
}

// ===================== BELI =====================
async function buy(sock, m, sid, prov, cc, pid) {
    const n = store()
    if (cfg().blokirOrderSaatMaintenance && maintenanceActive()) return reply(sock, m, "🛠️ Lagi maintenance singkat. Coba lagi beberapa menit lagi ya.")
    let offer
    try { offer = await findOffer(sid, prov, cc, pid) } catch (e) { return apiFail(sock, m, e) }
    if (!offer || offer.stock <= 0) return reply(sock, m, "Stok baru saja habis. Coba pilihan lain.", [quickButton("🛒 Order lagi", ".ordernokos")])

    const price = sellPrice(offer.price)
    const user = userOf(m.sender)
    if (user.nokosSaldo < price) return confirmBuy(sock, m, sid, prov, cc, pid)

    user.nokosSaldo -= price // tahan saldo dulu, dikembalikan kalau gagal
    const idem = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    let data
    try {
        const res = await Api.createOrder({ service_id: sid, provider: prov, country_code: cc, provider_id: pid, quoted_price: offer.price }, idem)
        data = res.data
    } catch (e) {
        user.nokosSaldo += price
        if (e.code === "insufficient_balance") {
            notifyOwner(sock, `⚠️ Saldo Nokoskuy API habis / kurang. Ada order masuk yang gagal. Deposit di website/API dulu.`)
            return reply(sock, m, "Layanan sedang penuh, coba lagi beberapa saat. Saldo kamu aman.")
        }
        if (e.code === "price_changed") return reply(sock, m, "Harga baru saja berubah. Silakan pilih ulang.", [quickButton("🛒 Order lagi", ".ordernokos")])
        return apiFail(sock, m, e, "Saldo kamu tidak terpotong.")
    }

    const rec = {
        id: data.id, ref: data.ref, sender: m.sender, chat: m.chat,
        serviceId: sid, serviceName: data.service?.name || svcNames.get(sid) || "Layanan",
        serverName: data.server?.name || (await serverName(prov)), serverLabel: data.server?.label || "",
        countryName: data.country?.name || countryNames.get(cc) || cc,
        apiPrice: offer.price, price, margin: price - offer.price,
        status: data.status, phone: data.phone || null, otp: null, lastOtp: null,
        expiresAt: Date.parse(data.expires_at) || Date.now() + 20 * 60000,
        createdAt: Date.now(), done: false, success: false, userRefunded: false, notifiedPhone: false
    }
    n.orders[rec.id] = rec
    await say(sock, m.chat,
        `✅ *Pesanan dibuat*\n\n🧾 Ref     : ${rec.ref}\n📲 Layanan : ${rec.serviceName}\n📡 Server  : ${rec.serverName}\n🌍 Negara  : ${rec.countryName}\n💵 Harga   : ${rp(price)}\n💰 Sisa saldo : ${rp(user.nokosSaldo)}\n\n⏳ Nomor sedang disiapkan...`,
        [quickButton("🔎 Cek Status", `.cekorder ${rec.ref}`), quickButton("❌ Batalkan", `.nks x ${rec.id}`)], { quoted: m })
    track(sock, rec.id)
}

// ===================== TRACKING ORDER =====================
const tracking = new Set()
function track(sock, id) {
    if (tracking.has(id)) return
    tracking.add(id)
    loopOrder(id, sock).catch((e) => console.log("[Nokos] tracking error:", e.message)).finally(() => tracking.delete(id))
}

async function loopOrder(id, firstSock) {
    const n = store()
    let errs = 0, grace = 0
    for (;;) {
        await sleep(4000)
        const rec = n.orders[id]
        const sock = S(firstSock)
        if (!rec || rec.done || !sock?.user) { if (!rec || rec.done) return; continue }

        let o
        try { o = (await Api.getOrder(id)).data; errs = 0 } catch (e) {
            if (e.code === "not_found" || ++errs > 90) { rec.done = true; return }
            continue
        }
        rec.status = o.status
        if (o.phone) rec.phone = o.phone
        if (o.expires_at) rec.expiresAt = Date.parse(o.expires_at) || rec.expiresAt

        if (o.phone && !rec.notifiedPhone) {
            rec.notifiedPhone = true
            await say(sock, rec.chat,
                `📲 *Nomor siap dipakai*\n\n🧾 Ref : ${rec.ref}\n📞 Nomor : *${o.phone}*\n\n1️⃣ Masukkan nomor ke aplikasi ${rec.serviceName}\n2️⃣ Minta kirim kode OTP\n3️⃣ OTP muncul di sini otomatis\n\n⏱️ Batas waktu: ${wib(rec.expiresAt)}`,
                [copyButton("📋 Salin Nomor", o.phone), quickButton("🔎 Cek Status", `.cekorder ${rec.ref}`), quickButton("❌ Batalkan", `.nks x ${rec.id}`)])
        }

        if (o.otp && o.otp !== rec.lastOtp) {
            const first = !rec.success
            rec.lastOtp = o.otp
            rec.otp = o.otp
            rec.success = true
            rec.successAt = Date.now()
            const btns = [copyButton("📋 Salin OTP", o.otp)]
            if (o.can_request_next_otp) btns.push(quickButton("🔁 OTP Lagi", `.nks n ${rec.id}`))
            btns.push(quickButton("✅ Selesai", `.nks f ${rec.id}`), quickButton("🛒 Order Lagi", ".ordernokos"))
            await say(sock, rec.chat, `🔐 *OTP masuk!*\n\n🧾 Ref : ${rec.ref}\n📞 Nomor : ${rec.phone || "-"}\n🔑 Kode : *${o.otp}*\n\n${o.otp_message ? `💬 ${String(o.otp_message).slice(0, 300)}\n\n` : ""}Terima kasih sudah order di *${toko()}* 🙏`, btns)
            if (first) notifyOrder(sock, rec, "sukses")
            if (!o.can_request_next_otp) { try { await Api.finish(id) } catch (e) {} }
        }

        if (rec.success) {
            if (!o.active || Date.now() > (rec.successAt || 0) + 15 * 60000) { rec.done = true; return }
            continue
        }

        if (!o.active) {
            if (o.refunded) {
                refundUser(rec)
                rec.done = true
                await say(sock, rec.chat, `↩️ *Pesanan berakhir tanpa OTP*\n\n🧾 Ref : ${rec.ref}\n💰 Saldo ${rp(rec.price)} sudah dikembalikan.`,
                    [quickButton("🛒 Order Lagi", ".ordernokos"), quickButton("💰 Cek Saldo", ".saldonokos")])
                notifyOrder(sock, rec, "gagal")
                return
            }
            if (++grace >= 15) {
                rec.done = true
                await say(sock, rec.chat, `⚠️ Pesanan *${rec.ref}* berakhir tapi pengembalian saldo belum terkonfirmasi. Hubungi owner dengan menyebut ref ini.`, [urlButton("👑 Hubungi Owner", global.linkOwner || website())])
                notifyOwner(sock, `⚠️ Order ${rec.ref} (${rec.sender}) berakhir tanpa OTP & refund belum terkonfirmasi. Cek manual.`)
                return
            }
        } else if (Date.now() > rec.expiresAt + 10 * 60000) {
            rec.done = true
            return
        }
    }
}

function refundUser(rec) {
    if (rec.userRefunded) return
    rec.userRefunded = true
    userOf(rec.sender).nokosSaldo += rec.price
}

// ===================== AKSI PESANAN =====================
function ownOrder(m, id, isOwner) {
    const rec = store().orders[id] || Object.values(store().orders).find((r) => r.ref === id)
    if (!rec) return null
    if (rec.sender !== m.sender && !isOwner) return null
    return rec
}

async function orderAction(sock, m, act, id, isOwner) {
    const rec = ownOrder(m, id, isOwner)
    if (!rec) return reply(sock, m, "Pesanan tidak ditemukan.")
    try {
        if (act === "x") {
            if (rec.success) return reply(sock, m, "OTP sudah diterima, pesanan tidak bisa dibatalkan.")
            await Api.cancel(rec.id)
            track(sock, rec.id)
            return reply(sock, m, `⏳ Pembatalan *${rec.ref}* diproses. Saldo kembali otomatis begitu dikonfirmasi.`)
        }
        if (act === "n") {
            await Api.nextOtp(rec.id)
            rec.otp = null; rec.done = false
            track(sock, rec.id)
            return reply(sock, m, `🔁 Meminta OTP berikutnya untuk *${rec.ref}*. Kirim ulang kode di aplikasi tujuan.`)
        }
        if (act === "f") {
            await Api.finish(rec.id)
            rec.done = true
            return reply(sock, m, `✅ Pesanan *${rec.ref}* ditutup. Makasih ya!`, [quickButton("🛒 Order Lagi", ".ordernokos")])
        }
    } catch (e) { return apiFail(sock, m, e) }
}

async function cekOrder(sock, m, args, isOwner) {
    const key = args[0]
    if (!key) return riwayat(sock, m)
    const rec = ownOrder(m, key, isOwner)
    if (!rec) return reply(sock, m, "Pesanan tidak ditemukan.")
    let live = null
    try { live = (await Api.getOrder(rec.id)).data } catch (e) {}
    const status = live?.status_label || live?.status || rec.status || "-"
    const body = `🔎 *Status Pesanan*\n\n🧾 Ref : ${rec.ref}\n📲 Layanan : ${rec.serviceName}\n📡 Server : ${rec.serverName}\n📞 Nomor : ${rec.phone || "-"}\n🔑 OTP : ${rec.otp || "-"}\n💵 Harga : ${rp(rec.price)}\n📌 Status : *${status}*${live?.refunded || rec.userRefunded ? "\n↩️ Saldo sudah dikembalikan" : ""}`
    const btns = [quickButton("🔄 Refresh", `.cekorder ${rec.ref}`)]
    if (!rec.done && !rec.success) btns.push(quickButton("❌ Batalkan", `.nks x ${rec.id}`))
    if (rec.phone) btns.unshift(copyButton("📋 Salin Nomor", rec.phone))
    if (!tracking.has(rec.id) && !rec.done) track(sock, rec.id)
    return say(sock, m.chat, body, btns, { quoted: m })
}

async function riwayat(sock, m) {
    const list = Object.values(store().orders).filter((r) => r.sender === m.sender).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
    if (!list.length) return reply(sock, m, "Belum ada riwayat order.", [quickButton("🛒 Order Sekarang", ".ordernokos")])
    const txt = list.map((r, i) => `${i + 1}. *${r.ref}* • ${r.serviceName}\n   ${rp(r.price)} • ${r.success ? "✅ Sukses" : r.userRefunded ? "↩️ Refund" : "⏳ Proses"} • ${wib(r.createdAt)}`).join("\n\n")
    return say(sock, m.chat, `📜 *Riwayat Order*\n\n${txt}`, [quickButton("🛒 Order Lagi", ".ordernokos"), quickButton("💰 Saldo", ".saldonokos")], { quoted: m })
}

// ===================== SALDO & DEPOSIT =====================
async function saldo(sock, m) {
    const u = userOf(m.sender), x = userStats(m.sender)
    return say(sock, m.chat, `💰 *Saldo & Statistik*\n\n💼 Saldo : *${rp(u.nokosSaldo)}*\n➕ Total deposit : ${rp(x.deposit)}\n🧾 Total transaksi : ${x.total}\n✅ Total sukses : ${x.sukses}\n❌ Total gagal : ${x.gagal}`, [
        quickButton("➕ Deposit Saldo", ".depositnokos"), quickButton("🛒 Order Nokos", ".ordernokos"), quickButton("🏠 Beranda", ".start")
    ], { quoted: m })
}

async function depositCmd(sock, m, args) {
    const amount = parseInt(String(args[0] || "").replace(/\D/g, ""), 10)
    const adm = marginQr()
    if (!amount) {
        userOf(m.sender).nokosAwait = { t: "dep", at: Date.now() }
        const rows = [5000, 10000, 20000, 50000, 100000, 200000].map((v) => ({ title: rp(v), description: `Saldo masuk ${rp(Math.max(0, v - adm))}`, id: `.depositnokos ${v}` }))
        return say(sock, m.chat, `➕ *Deposit Saldo*\n\n✍️ *Ketik nominalnya sekarang* (angka saja, contoh: 20000)\natau pilih nominal cepat lewat tombol di bawah.\n\nMinimal Rp2.000 • Biaya admin ${rp(adm)} (dipotong dari saldo masuk).`, [
            listButton("💳 Nominal cepat", `© ${toko()}`, rows),
            quickButton("🏠 Beranda", ".start")
        ], { quoted: m })
    }
    userOf(m.sender).nokosAwait = null
    if (amount < 2000 || amount > 1000000) return reply(sock, m, "Nominal deposit harus Rp2.000 sampai Rp1.000.000.")
    if (amount - adm <= 0) return reply(sock, m, `Nominal terlalu kecil. Biaya admin ${rp(adm)}, deposit lebih besar ya.`)

    let d
    try { d = (await Api.createDeposit(amount)).data } catch (e) {
        if (e.code === "deposit_pending") return reply(sock, m, "Masih ada deposit yang belum dibayar. Selesaikan atau tunggu kedaluwarsa dulu.", [quickButton("🔄 Cek Deposit", `.nks d ${e.detail.deposit_id || ""}`)])
        return apiFail(sock, m, e)
    }
    const credit = amount - adm
    store().deposits[d.id] = { id: d.id, ref: d.ref, sender: m.sender, chat: m.chat, amount, total: d.total, credit, status: "menunggu", expiresAt: Date.parse(d.expires_at) || Date.now() + 15 * 60000, credited: false, createdAt: Date.now() }

    let qr = null
    try {
        if (d.payment?.qris) {
            if (d.payment.qris_is_image_url) qr = Buffer.from((await axios.get(d.payment.qris, { responseType: "arraybuffer", timeout: 15000 })).data)
            else { const QR = require("qrcode"); qr = await QR.toBuffer(d.payment.qris, { width: 560, margin: 2 }) }
        }
    } catch (e) { qr = null }

    const body = `➕ *Tagihan Deposit*\n\n🧾 Ref : ${d.ref}\n💳 Bayar : *${rp(d.total)}* (QRIS)\n💰 Saldo masuk : *${rp(credit)}*\n⏱️ Batas bayar : ${wib(Date.parse(d.expires_at))}\n\nBayar sesuai total, saldo masuk otomatis.${qr ? "" : "\nBuka halaman bayar untuk melihat QR."}`
    await say(sock, m.chat, body, [
        urlButton("💳 Buka Halaman Bayar", d.checkout_url),
        quickButton("🔄 Cek Status", `.nks d ${d.id}`),
        quickButton("❌ Batalkan", `.nks dx ${d.id}`)
    ], { image: qr, quoted: m })
    trackDeposit(sock, d.id)
}

const trackingDep = new Set()
function trackDeposit(sock, id) {
    if (trackingDep.has(id)) return
    trackingDep.add(id)
    loopDeposit(id, sock).catch((e) => console.log("[Nokos] deposit error:", e.message)).finally(() => trackingDep.delete(id))
}

async function loopDeposit(id, firstSock) {
    const n = store()
    let errs = 0
    for (;;) {
        await sleep(4000)
        const rec = n.deposits[id]
        const sock = S(firstSock)
        if (!rec || rec.status !== "menunggu") return
        if (!sock?.user) continue
        let d
        try { d = (await Api.getDeposit(id)).data; errs = 0 } catch (e) {
            if (e.code === "not_found") { rec.status = "dibatalkan"; return }
            if (++errs > 60) return
            continue
        }
        if (d.status === "berhasil") {
            rec.status = "berhasil"
            if (!rec.credited) {
                rec.credited = true
                userOf(rec.sender).nokosSaldo += rec.credit
                userOf(rec.sender).nokosDeposit = (userOf(rec.sender).nokosDeposit || 0) + rec.credit
                await say(sock, rec.chat, `✅ *Deposit berhasil*\n\n🧾 Ref : ${rec.ref}\n💰 Saldo masuk : *${rp(rec.credit)}*\n💼 Saldo sekarang : *${rp(userOf(rec.sender).nokosSaldo)}*`,
                    [quickButton("🛒 Order Nokos", ".ordernokos"), quickButton("💰 Cek Saldo", ".saldonokos")])
                notifyDeposit(sock, rec)
            }
            return
        }
        if (d.status === "kedaluwarsa" || d.status === "dibatalkan") {
            rec.status = d.status
            await say(sock, rec.chat, `⌛ Deposit *${rec.ref}* ${d.status}. Buat tagihan baru kalau masih mau isi saldo.`, [quickButton("➕ Deposit Lagi", ".depositnokos")])
            return
        }
        if (Date.now() > rec.expiresAt + 60000) { rec.status = "kedaluwarsa"; return }
    }
}

async function depositAction(sock, m, act, id, isOwner) {
    const rec = store().deposits[id]
    if (!rec || (rec.sender !== m.sender && !isOwner)) return reply(sock, m, "Deposit tidak ditemukan.")
    try {
        if (act === "dx") {
            await Api.cancelDeposit(id)
            rec.status = "dibatalkan"
            return reply(sock, m, `Deposit *${rec.ref}* dibatalkan.`, [quickButton("➕ Deposit Lagi", ".depositnokos")])
        }
        const d = (await Api.getDeposit(id)).data
        if (!trackingDep.has(id) && rec.status === "menunggu") trackDeposit(sock, id)
        return reply(sock, m, `🔄 Deposit *${rec.ref}*: ${d.status_label || d.status}${d.status === "berhasil" ? `\n💰 Saldo masuk ${rp(rec.credit)}` : ""}`)
    } catch (e) { return apiFail(sock, m, e) }
}

// ===================== NOTIFIKASI SALURAN =====================
async function notifyOrder(sock, rec, status) {
    try {
        const s = st()
        if (!notifActive() || !notifChannel()) return
        const ok = status === "sukses"
        const text = ok
            ? `🛒 *TRANSAKSI NOKOS*\n\n👤 Pembeli : +${maskNum(rec.sender.split("@")[0])}\n📲 Layanan : ${rec.serviceName}\n📡 ${rec.serverName} • ${rec.countryName}\n📞 Nomor : ${maskNum(rec.phone)}\n💵 Harga : ${rp(rec.price)}\n✅ Status : OTP diterima\n🧾 Ref : ${rec.ref}\n🕒 ${wib()}\n\n— ${toko()}`
            : `↩️ *ORDER NOKOS GAGAL (REFUND)*\n\n👤 Pembeli : +${maskNum(rec.sender.split("@")[0])}\n📲 ${rec.serviceName} • ${rec.serverName}\n💵 ${rp(rec.price)} dikembalikan otomatis\n🧾 Ref : ${rec.ref}\n🕒 ${wib()}\n\n— ${toko()}`
        await sendChannelText(sock, notifChannel(), text)
    } catch (e) { notifErr(sock, "order", e) }
}

async function notifyDeposit(sock, rec) {
    try {
        const s = st()
        if (!notifActive() || !notifChannel()) return
        await sendChannelText(sock, notifChannel(),
            `💰 *DEPOSIT NOKOS*\n\n👤 Pembeli : +${maskNum(rec.sender.split("@")[0])}\n💳 Dibayar : ${rp(rec.total)}\n💵 Saldo masuk : ${rp(rec.credit)}\n🧾 Ref : ${rec.ref}\n🕒 ${wib()}\n\n— ${toko()}`)
    } catch (e) { notifErr(sock, "deposit", e) }
}

let lastNotifErr = 0
function notifErr(sock, what, e) {
    console.log(`[Nokos] ${what} gagal:`, e.message)
    if (Date.now() - lastNotifErr < 10 * 60000) return
    lastNotifErr = Date.now()
    notifyOwner(sock, `⚠️ Notifikasi ke saluran gagal (${what}): ${e.message}\nCek .tesnotifch (bot harus admin saluran).`)
}

function notifyOwner(sock, text) {
    try { sock.sendMessage(String(global.owner) + "@s.whatsapp.net", { text }).catch(() => {}) } catch (e) {}
}

// ===================== STATUS SERVER & MAINTENANCE =====================
async function serverCard(tone, judul, subjudul) {
    const servers = (await listProviders(true)).map((p) => ({ name: p.name, active: p.active }))
    return {
        servers,
        img: await Img.statusCard({ toko: toko(), owner: ownerName(), tone, judul, subjudul, servers, waktu: wib(), website: website() })
    }
}

async function statusServer(sock, m) {
    const c = await serverCard("ok", "STATUS SERVER", "Data langsung dari sistem")
    const aktif = c.servers.filter((s) => s.active).length
    return say(sock, m.chat,
        `📡 *Status Server*\n\n${c.servers.map((s) => `${s.active ? "🟢" : "🔴"} ${s.name}`).join("\n")}\n\n✅ ${aktif}/${c.servers.length} server aktif\n🕒 ${wib()}`,
        [quickButton("🛒 Order Sekarang", ".ordernokos"), quickButton("🔄 Refresh", ".statusserver"), urlButton("🌐 Website", website())],
        { image: c.img, quoted: m })
}

const maintenanceActive = () => { const mt = store().maint; return !!mt && mt.endAt > Date.now() }

async function sendMaintenance(sock, kind, force) {
    const s = st()
    if (!notifChannel() || (!notifActive() && !force)) return null
    const menit = Number(cfg().menitMaintenance) || 10
    let cap
    if (kind === "mulai") {
        cap = `🛠️ *MAINTENANCE BERKALA*\n\nSistem *${toko()}* sedang pengecekan rutin ±${menit} menit.\nOrder mungkin tertunda sebentar, saldo tetap aman.\n\n🕒 ${wib()}`
    } else {
        const all = await listProviders(true)
        const ok = all.filter((p) => p.active).length
        cap = `✅ *MAINTENANCE SELESAI*\n\n${all.map((p) => `${p.active ? "🟢" : "🔴"} ${p.name}`).join("\n")}\n\n${ok}/${all.length} server aktif\n🕒 ${wib()}`
    }
    return sendChannelText(sock, notifChannel(), cap)
}

async function tick() {
    try {
        const sock = global.sock
        if (!sock?.user) return
        const n = store()
        const s = st()
        if (n.maint && Date.now() >= n.maint.endAt) {
            n.maint = null
            if (notifActive() && notifChannel()) await sendMaintenance(sock, "selesai")
        }
        const jam = cfg().jamMaintenance || [12, 0]
        const now = jakarta()
        if (jam.includes(now.hour) && now.minute < 5) {
            const slot = `${now.date}-${now.hour}`
            if (n.lastSlot !== slot) {
                n.lastSlot = slot
                n.maint = { endAt: Date.now() + (Number(cfg().menitMaintenance) || 10) * 60000 }
                if (notifActive() && notifChannel()) await sendMaintenance(sock, "mulai")
            }
        }
    } catch (e) { console.log("[Nokos] scheduler error:", e.message) }
}

function resume(sock) {
    global.sock = sock
    try {
        const n = store()
        for (const rec of Object.values(n.orders)) if (!rec.done) track(sock, rec.id)
        for (const d of Object.values(n.deposits)) if (d.status === "menunggu") trackDeposit(sock, d.id)
    } catch (e) { console.log("[Nokos] resume error:", e.message) }
    if (!global.nokosSched) global.nokosSched = setInterval(tick, 30000)
}

// ===================== UTIL BALASAN =====================
async function reply(sock, m, text, buttons) {
    if (buttons) return say(sock, m.chat, text, buttons, { quoted: m })
    return sock.sendMessage(m.chat, { text }, { quoted: m })
}

function apiFail(sock, m, e, extra = "") {
    const map = {
        no_api_key: "API key Nokoskuy belum diisi. Hubungi owner.",
        network: "Koneksi ke server lagi bermasalah. Coba lagi sebentar ya.",
        not_found: "Data tidak ditemukan.",
        out_of_stock: "Stok habis. Coba server atau negara lain.",
        rate_limited: "Terlalu cepat, tunggu beberapa detik lalu coba lagi.",
        server_unavailable: "Server ini sedang gangguan. Coba server lain.",
        catalog_unavailable: "Katalog sedang gangguan. Coba lagi nanti.",
        service_disabled: "Layanan dinonaktifkan sementara.",
        order_failed: "Pembelian gagal di sisi layanan. Saldo dikembalikan.",
        cannot_cancel: "Pesanan ini tidak bisa dibatalkan.",
        otp_already_received: "OTP sudah diterima.",
        otp_not_received: "OTP belum masuk.",
        order_not_ready: "Pesanan belum siap untuk aksi ini."
    }
    console.log("[Nokos] API error:", e.code, e.message)
    return reply(sock, m, `⚠️ ${map[e.code] || "Terjadi kendala: " + (e.message || e.code)}${extra ? "\n" + extra : ""}`)
}

// cek API key nokos: kosong / masih placeholder / ditolak server -> kembalikan alasan, kalau beres null
async function keyProblem() {
    const k = cfg().apiKey || ""
    if (!k || /^ISI_/i.test(k)) return "belum diisi"
    try { await Api.balance() } catch (e) {
        if (e.status === 401 || e.status === 403 || /unauthor|invalid_api|api_key/i.test(e.code || "")) return "tidak valid / ditolak server"
        // gangguan jaringan sementara: key sudah ada, jangan menghalangi
    }
    return null
}
// ===================== OWNER =====================
async function ownerCmd(sock, m, command, args) {
    const s = st()
    const text = args.join(" ").trim()
    if (command === "nokosmode") {
        const v = (args[0] || "").toLowerCase()
        if (!["on", "off"].includes(v)) return reply(sock, m, `Mode nokos sekarang: *${s.mode ? "ON" : "OFF"}*\n\nPakai:\n.nokosmode on\n.nokosmode off`)
        if (v === "on") {
            const cek = await keyProblem()
            if (cek) {
                s.mode = false
                return reply(sock, m, `🔒 *Nokos Mode belum bisa diaktifkan*\n\n❌ API key Nokoskuy ${cek}\n\n1. Daftar / login di https://www.welper.web.id\n2. Ambil API key di menu Developer\n3. Isi di settings.js > global.nokos.apiKey, simpan, lalu restart bot\n\nSetelah itu ketik *.nokosmode on* lagi.`)
            }
        }
        s.mode = v === "on"
        return reply(sock, m, s.mode
            ? `✅ *Nokos Mode ON*\nBot khusus order nokos untuk user (owner tetap bisa semua fitur).\n📢 Saluran: ${s.channelId || "belum diatur (.setnotifch)"}\n🔑 API key: ${/^ISI_|^$/i.test(cfg().apiKey || "") ? "BELUM diisi di settings.js" : "terisi"}`
            : `✅ *Nokos Mode OFF*\nBot kembali jalan seperti script biasa.`)
    }
    if (command === "setnotifch") {
        if (!text) return reply(sock, m, `ID saluran sekarang: ${s.channelId || "-"}\n\nPakai:\n.setnotifch 1203xxxxxxxx@newsletter\n.setnotifch https://whatsapp.com/channel/xxxx\n.setnotifch reset`)
        if (text === "reset") { s.channelId = ""; return reply(sock, m, "ID saluran dihapus.") }
        let id = text
        const link = text.match(/whatsapp\.com\/channel\/([\w-]+)/i)
        if (link) {
            try { const meta = await sock.newsletterMetadata("invite", link[1]); id = meta.id } catch (e) { return reply(sock, m, "Gagal baca link saluran. Pakai ID berakhiran @newsletter (cek lewat .cekidch).") }
        }
        if (!/@(newsletter|g\.us)$/.test(id)) return reply(sock, m, "ID harus berakhiran @newsletter (saluran) atau @g.us (grup).")
        s.channelId = id
        return reply(sock, m, `✅ ID saluran notifikasi disimpan:\n${id}\n\nCoba kirim tes dengan *.tesnotifch*`)
    }
    if (command === "tesnotifch") {
        if (!s.channelId) return reply(sock, m, "Belum ada ID saluran. Pakai .setnotifch dulu.")
        const out = []
        try {
            const meta = await withTimeout(sock.newsletterMetadata("jid", s.channelId), 20000, "baca saluran")
            const role = meta?.viewer_metadata?.role || meta?.viewerMetadata?.role || "tidak terbaca"
            out.push(`📢 Saluran: ${meta?.name || "-"} • role bot: ${role}`)
            if (role !== "tidak terbaca" && !/OWNER|ADMIN/i.test(role)) out.push("⚠️ Bot BUKAN admin/owner saluran, pesan tidak akan tampil.")
        } catch (e) { out.push(`⚠️ Info saluran tidak terbaca: ${e.message}`) }
        try {
            await sendChannelText(sock, s.channelId, `🧪 *TES NOTIFIKASI*\n\n👤 Pembeli : +6281****890\n📲 Layanan : WhatsApp\n💵 Harga : ${rp(4500)}\n🕒 ${wib()}\n\n— ${toko()}`)
            out.push("✅ Teks tes terkirim, cek salurannya.")
        } catch (e) { out.push(`❌ Gagal kirim: ${e.message}\nID saluran salah / bot bukan admin saluran.`) }
        out.push(s.mode ? "ℹ️ Nokos Mode ON: notif transaksi asli aktif." : "ℹ️ Nokos Mode OFF: notif transaksi asli baru jalan kalau .nokosmode on.")
        return reply(sock, m, out.join("\n"))
    }
    if (command === "setnamatoko" || command === "setnamaowner") {
        const key = command === "setnamatoko" ? "namaToko" : "namaOwner"
        if (!text) return reply(sock, m, `Nama sekarang: *${key === "namaToko" ? toko() : ownerName()}*\n\nPakai: .${command} <nama baru>\nAtau: .${command} reset`)
        s[key] = text === "reset" ? "" : text.slice(0, 40)
        return reply(sock, m, `✅ ${key === "namaToko" ? "Nama toko" : "Nama owner"} sekarang: *${key === "namaToko" ? toko() : ownerName()}*\nDipakai di struk & notifikasi saluran.`)
    }
    if (command === "tesmaintenance") {
        if (!s.channelId) return reply(sock, m, "Belum ada ID saluran. Pakai .setnotifch dulu.")
        const kind = (args[0] || "mulai").toLowerCase() === "selesai" ? "selesai" : "mulai"
        try { await sendMaintenance(sock, kind, true); return reply(sock, m, `✅ Tes maintenance (${kind}) terkirim.`) } catch (e) { return reply(sock, m, `❌ Gagal: ${e.message}`) }
    }
    if (command === "saldoapi") {
        try {
            const r = await Api.balance()
            return reply(sock, m, `💼 *Saldo Nokoskuy (API)*\n\n${JSON.stringify(r.data, null, 2).slice(0, 800)}`)
        } catch (e) { return apiFail(sock, m, e) }
    }
    if (command === "addsaldonokos") {
        const target = (m.mentionedJid && m.mentionedJid[0]) || ((args[0] || "").replace(/\D/g, "") + "@s.whatsapp.net")
        const amt = parseInt(String(args[args.length - 1] || "").replace(/\D/g, ""), 10)
        if (!target || target.startsWith("@") || !amt) return reply(sock, m, "Pakai: .addsaldonokos 628xxx 10000\n(atau tag orangnya)")
        userOf(target).nokosSaldo += amt
        return reply(sock, m, `✅ Saldo +${rp(amt)} untuk @${target.split("@")[0]}\nSaldo sekarang: ${rp(userOf(target).nokosSaldo)}`)
    }
}

// ===================== PESAN BIASA (bukan command) =====================
async function showHome(sock, m, isOwner) {
    try {
        const W = require("./Warung.js")
        if (W.modeOn()) return W.showHome(sock, m, isOwner) // Warung ON: halaman awal = 3 kategori warung
    } catch (e) {}
    const u = userOf(m.sender)
    if (Date.now() - (u.nokosHomeAt || 0) < 8000) return true // cegah spam
    u.nokosHomeAt = Date.now()
    await hub(sock, m, isOwner)
    return true
}

// dipanggil untuk pesan non-command di chat pribadi
async function handleText({ sock, m, isOwner }) {
    if (m.isGroup || m.fromMe) return false
    const body = String(m.body || "").trim()
    if (!body) return false
    const u = userOf(m.sender)
    if (u.nokosAwait && Date.now() - u.nokosAwait.at < 5 * 60000) {
        const t = u.nokosAwait.t
        if (t === "cari") { u.nokosAwait = null; await serviceList(sock, m, 1, body.slice(0, 40)); return true }
        if (t === "dep" && /^(rp)?[\d.,\s]+$/i.test(body)) { await depositCmd(sock, m, [body]); return true }
        u.nokosAwait = null
    }
    if (!modeOn() || isOwner) return false
    return showHome(sock, m, isOwner) // Nokos Mode ON: chat apa pun langsung ke halaman nokos
}

// ===================== PINTU MASUK =====================
const USER_CMDS = new Set(["start", "nokos", "ordernokos", "nks", "saldonokos", "depositnokos", "cekorder", "riwayatnokos", "statusserver"])
const OWNER_CMDS = new Set(["nokosmode", "setnotifch", "tesnotifch", "setnamatoko", "setnamaowner", "tesmaintenance", "saldoapi", "addsaldonokos"])

// command yang tetap boleh dipakai user biasa saat Nokos Mode ON
const ALLOWED_WHEN_ON = new Set([...USER_CMDS, "owner", "own"]) // tanpa menu / allmenu

async function handle({ sock, m, command, args, isOwner }) {
    if (OWNER_CMDS.has(command)) {
        if (!isOwner) { await reply(sock, m, global.mess?.owner || "Fitur ini hanya untuk ownerbot."); return true }
        await ownerCmd(sock, m, command, args)
        return true
    }
    if (!USER_CMDS.has(command)) return false
    if (m.isGroup) {
        // semua fitur nokos cuma lewat chat pribadi; saat Nokos Mode ON di grup diam saja
        if (!modeOn()) await reply(sock, m, "Fitur nokos hanya bisa lewat chat pribadi bot, biar saldo & OTP kamu aman. Chat bot langsung ya 🙏")
        return true
    }
    userOf(m.sender)
    switch (command) {
        case "start": case "nokos": await hub(sock, m, isOwner); break
        case "ordernokos": await orderStart(sock, m, args); break
        case "saldonokos": await saldo(sock, m); break
        case "depositnokos": await depositCmd(sock, m, args); break
        case "cekorder": await cekOrder(sock, m, args, isOwner); break
        case "riwayatnokos": await riwayat(sock, m); break
        case "statusserver": await statusServer(sock, m); break
        case "nks": {
            const [act, a, b, c, d] = args
            if (act === "q") {
                userOf(m.sender).nokosAwait = { t: "cari", at: Date.now() }
                await say(sock, m.chat, "🔍 *Cari Layanan*\n\n✍️ *Ketik nama layanannya sekarang*\nContoh: whatsapp, telegram, shopee", [quickButton("📋 Semua Layanan", ".ordernokos"), quickButton("🏠 Beranda", ".start")], { quoted: m })
            } else if (act === "p") await serviceList(sock, m, parseInt(a, 10) || 1)
            else if (act === "s") await pickServer(sock, m, a)
            else if (act === "c") await pickCountry(sock, m, a, b)
            else if (act === "o") await pickOffer(sock, m, a, b, c)
            else if (act === "k") await confirmBuy(sock, m, a, b, c, d)
            else if (act === "b") await buy(sock, m, a, b, c, d)
            else if (["x", "n", "f"].includes(act)) await orderAction(sock, m, act, a, isOwner)
            else if (["d", "dx"].includes(act)) await depositAction(sock, m, act, a, isOwner)
            break
        }
    }
    return true
}

module.exports = { keyProblem, handle, handleText, showHome, userStats, resume, modeOn, ALLOWED_WHEN_ON, marginOrder, marginQr, sellPrice, maskNum, _internal: { store, st, userOf, jakarta, tick } }
