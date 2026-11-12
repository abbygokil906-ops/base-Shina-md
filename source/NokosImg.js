/*
  NokosImg — bikin foto struk transaksi & kartu status server.
  Utama: @napi-rs/canvas (tampilan bagus). Kalau belum terpasang, otomatis fallback ke Jimp (lebih sederhana).
*/
let Canvas = null
try { Canvas = require("@napi-rs/canvas") } catch (e) { Canvas = null }

const W = 820
const FONT = "sans-serif"

const THEME = {
    sukses: { a: "#4f46e5", b: "#7c3aed", badge: "#22c55e", label: "TRANSAKSI BERHASIL" },
    gagal: { a: "#be123c", b: "#e11d48", badge: "#ef4444", label: "GAGAL - SALDO DIKEMBALIKAN" },
    proses: { a: "#0369a1", b: "#0ea5e9", badge: "#f59e0b", label: "DALAM PROSES" },
    ok: { a: "#047857", b: "#10b981", badge: "#22c55e", label: "SEMUA SERVER NORMAL" },
    warn: { a: "#b45309", b: "#f59e0b", badge: "#f59e0b", label: "MAINTENANCE BERKALA" }
}

function rr(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

function fit(ctx, text, maxW) {
    let t = String(text ?? "-")
    if (ctx.measureText(t).width <= maxW) return t
    while (t.length > 1 && ctx.measureText(t + "...").width > maxW) t = t.slice(0, -1)
    return t + "..."
}

function bg(ctx, h) {
    const g = ctx.createLinearGradient(0, 0, W, h)
    g.addColorStop(0, "#0b1020")
    g.addColorStop(1, "#1e1b4b")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, h)
    // titik hiasan halus
    ctx.fillStyle = "rgba(255,255,255,0.04)"
    for (let i = 0; i < 60; i++) {
        ctx.beginPath()
        ctx.arc((i * 137) % W, (i * 251) % h, 2 + (i % 3), 0, Math.PI * 2)
        ctx.fill()
    }
}

function header(ctx, t, x, y, w, toko, owner, judul) {
    const g = ctx.createLinearGradient(x, y, x + w, y + 190)
    g.addColorStop(0, t.a)
    g.addColorStop(1, t.b)
    ctx.save()
    rr(ctx, x, y, w, 190, 28)
    ctx.clip()
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, 190)
    ctx.fillStyle = "rgba(255,255,255,0.10)"
    ctx.beginPath(); ctx.arc(x + w - 40, y + 20, 120, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + 30, y + 190, 90, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    ctx.fillStyle = "#fff"
    ctx.textAlign = "center"
    ctx.font = `bold 44px ${FONT}`
    ctx.fillText(fit(ctx, String(toko).toUpperCase(), w - 80), x + w / 2, y + 78)
    ctx.font = `500 22px ${FONT}`
    ctx.fillStyle = "rgba(255,255,255,0.85)"
    ctx.fillText(`${judul}  |  Owner: ${owner}`, x + w / 2, y + 118)
    ctx.textAlign = "left"
}

function badge(ctx, t, cx, cy, kind) {
    ctx.fillStyle = "#ffffff"
    ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = t.badge
    ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "#fff"
    ctx.lineWidth = 8
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    if (kind === "gagal") {
        ctx.moveTo(cx - 16, cy - 16); ctx.lineTo(cx + 16, cy + 16)
        ctx.moveTo(cx + 16, cy - 16); ctx.lineTo(cx - 16, cy + 16)
    } else if (kind === "proses" || kind === "warn") {
        ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 2); ctx.lineTo(cx + 14, cy + 10)
    } else {
        ctx.moveTo(cx - 18, cy + 2); ctx.lineTo(cx - 5, cy + 15); ctx.lineTo(cx + 20, cy - 14)
    }
    ctx.stroke()
}

function zigzag(ctx, x, y, w, color) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x, y)
    const step = 22
    for (let i = 0; i <= w / step; i++) {
        ctx.lineTo(x + i * step + step / 2, y + 14)
        ctx.lineTo(x + (i + 1) * step, y)
    }
    ctx.lineTo(x + w, y - 4); ctx.lineTo(x, y - 4)
    ctx.closePath()
    ctx.fill()
}

function barcode(ctx, x, y, w, h, seed) {
    let n = 0
    for (const ch of String(seed)) n = (n * 31 + ch.charCodeAt(0)) >>> 0
    ctx.fillStyle = "#111827"
    let cx = x
    while (cx < x + w) {
        n = (n * 1103515245 + 12345) >>> 0
        const bw = 2 + (n % 4)
        if ((n >> 8) % 2 === 0) ctx.fillRect(cx, y, bw, h)
        cx += bw + 2
    }
}

// ========== STRUK ==========
async function receipt(o) {
    const status = o.status || "sukses"
    const t = THEME[status] || THEME.sukses
    const rows = o.rows || []
    if (!Canvas) return fallback(o.toko, `${t.label}`, [`Ref: ${o.ref || "-"}`, ...rows.map(([k, v]) => `${k}: ${v}`), `Total: ${o.amount || "-"}`])

    const rowH = 54
    const H = 190 + 130 + 120 + rows.length * rowH + 250
    const canvas = Canvas.createCanvas(W, H)
    const ctx = canvas.getContext("2d")
    bg(ctx, H)

    const px = 40, py = 40, pw = W - 80, ph = H - 80
    // bayangan kertas
    ctx.save()
    ctx.shadowColor = "rgba(0,0,0,0.45)"
    ctx.shadowBlur = 34
    ctx.shadowOffsetY = 12
    ctx.fillStyle = "#ffffff"
    rr(ctx, px, py, pw, ph - 10, 28)
    ctx.fill()
    ctx.restore()
    zigzag(ctx, px, py + ph - 14, pw, "#ffffff")

    header(ctx, t, px, py, pw, o.toko, o.owner, "STRUK TRANSAKSI")
    badge(ctx, t, W / 2, py + 190, status)

    let y = py + 190 + 90
    ctx.textAlign = "center"
    ctx.fillStyle = t.a
    ctx.font = `bold 24px ${FONT}`
    ctx.fillText(t.label, W / 2, y)
    y += 58
    ctx.fillStyle = "#0f172a"
    ctx.font = `bold 56px ${FONT}`
    ctx.fillText(o.amount || "-", W / 2, y)
    y += 28
    ctx.fillStyle = "#64748b"
    ctx.font = `500 20px ${FONT}`
    ctx.fillText(o.tanggal || "", W / 2, y + 12)
    ctx.textAlign = "left"
    y += 50

    ctx.setLineDash([8, 8]); ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(px + 36, y); ctx.lineTo(px + pw - 36, y); ctx.stroke()
    ctx.setLineDash([])
    y += 18

    for (const [k, v] of rows) {
        ctx.font = `500 22px ${FONT}`
        ctx.fillStyle = "#64748b"
        ctx.fillText(k, px + 40, y + 30)
        ctx.font = `bold 23px ${FONT}`
        ctx.fillStyle = "#0f172a"
        ctx.textAlign = "right"
        ctx.fillText(fit(ctx, v, pw - 300), px + pw - 40, y + 30)
        ctx.textAlign = "left"
        ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(px + 40, y + rowH - 6); ctx.lineTo(px + pw - 40, y + rowH - 6); ctx.stroke()
        y += rowH
    }

    y += 24
    ctx.fillStyle = "#f8fafc"
    rr(ctx, px + 36, y, pw - 72, 70, 16); ctx.fill()
    ctx.fillStyle = "#64748b"; ctx.font = `500 20px ${FONT}`
    ctx.fillText("No. Referensi", px + 56, y + 31)
    ctx.fillStyle = "#0f172a"; ctx.font = `bold 26px ${FONT}`
    ctx.fillText(o.ref || "-", px + 56, y + 58)
    y += 100

    barcode(ctx, px + 70, y, pw - 140, 54, o.ref || "x")
    y += 90
    ctx.textAlign = "center"
    ctx.fillStyle = "#475569"; ctx.font = `500 20px ${FONT}`
    ctx.fillText(o.footer || "Terima kasih sudah order!", W / 2, y)
    ctx.fillStyle = t.a; ctx.font = `bold 20px ${FONT}`
    ctx.fillText(o.website || "", W / 2, y + 30)

    return canvas.toBuffer("image/jpeg", 92)
}

// ========== KARTU STATUS SERVER ==========
async function statusCard(o) {
    const tone = o.tone === "warn" ? "warn" : "ok"
    const t = THEME[tone]
    const servers = o.servers || []
    if (!Canvas) return fallback(o.toko, o.judul || t.label, servers.map((s) => `${s.name}: ${s.active ? "Active" : "Gangguan"}`))

    const cols = 2
    const rowsN = Math.ceil(servers.length / cols)
    const H = 190 + 170 + rowsN * 96 + 200
    const canvas = Canvas.createCanvas(W, H)
    const ctx = canvas.getContext("2d")
    bg(ctx, H)

    const px = 40, py = 40, pw = W - 80
    ctx.save()
    ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 34; ctx.shadowOffsetY = 12
    ctx.fillStyle = "#ffffff"
    rr(ctx, px, py, pw, H - 90, 28); ctx.fill()
    ctx.restore()

    header(ctx, t, px, py, pw, o.toko, o.owner, "STATUS LAYANAN")
    badge(ctx, t, W / 2, py + 190, tone)

    let y = py + 190 + 92
    ctx.textAlign = "center"
    ctx.fillStyle = t.a; ctx.font = `bold 30px ${FONT}`
    ctx.fillText(o.judul || t.label, W / 2, y)
    ctx.fillStyle = "#64748b"; ctx.font = `500 21px ${FONT}`
    ctx.fillText(o.subjudul || "", W / 2, y + 36)
    ctx.textAlign = "left"
    y += 70

    const cw = (pw - 36 * 2 - 20) / cols
    servers.forEach((s, i) => {
        const cx = px + 36 + (i % cols) * (cw + 20)
        const cy = y + Math.floor(i / cols) * 96
        ctx.fillStyle = "#f8fafc"
        rr(ctx, cx, cy, cw, 80, 16); ctx.fill()
        ctx.strokeStyle = s.active ? "#bbf7d0" : "#fecaca"; ctx.lineWidth = 2
        rr(ctx, cx, cy, cw, 80, 16); ctx.stroke()
        ctx.fillStyle = s.active ? "#22c55e" : "#ef4444"
        ctx.beginPath(); ctx.arc(cx + 34, cy + 40, 11, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = "#0f172a"; ctx.font = `bold 25px ${FONT}`
        ctx.fillText(fit(ctx, s.name, cw - 150), cx + 62, cy + 36)
        ctx.fillStyle = s.active ? "#16a34a" : "#dc2626"; ctx.font = `500 20px ${FONT}`
        ctx.fillText(s.active ? "Active" : "Gangguan", cx + 62, cy + 62)
    })

    y += rowsN * 96 + 30
    ctx.textAlign = "center"
    ctx.fillStyle = "#475569"; ctx.font = `500 20px ${FONT}`
    ctx.fillText(o.waktu || "", W / 2, y)
    ctx.fillStyle = t.a; ctx.font = `bold 20px ${FONT}`
    ctx.fillText(o.website || "", W / 2, y + 30)
    return canvas.toBuffer("image/jpeg", 92)
}

// ========== FALLBACK JIMP (tanpa canvas) ==========
async function fallback(title, sub, lines) {
    const Jimp = require("jimp")
    const f32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
    const f16 = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)
    const H = 170 + lines.length * 34 + 40
    const img = new Jimp(W, H, 0x0f172aff)
    img.print(f32, 30, 30, String(title || "").slice(0, 40))
    img.print(f16, 30, 80, String(sub || "").slice(0, 80))
    lines.forEach((l, i) => img.print(f16, 30, 140 + i * 34, String(l).slice(0, 90)))
    return img.quality(90).getBufferAsync(Jimp.MIME_JPEG)
}

module.exports = { receipt, statusCard, hasCanvas: !!Canvas }
