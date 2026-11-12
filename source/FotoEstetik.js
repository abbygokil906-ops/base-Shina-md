/*
  Foto Estetik (kumpulan template "tmpl*") — dipanggil dari source/SetorTemplate.js.
  Satu command = satu gaya poster. Jumlah foto & teks beda-beda tiap template (lihat `photos` & `fields`).

    .tmplig       Kim Gaeul style: 2 kartu post IG + menu story + nama outline     (1 foto)
    .tmplprofil   Profil IG gelap + orang keluar layar + dadu + chat                (1 foto)
    .tmplsearch   Pencarian IG "Accounts": 2 kartu profil + chat + keyboard         (1 foto)
    .tmplduo      Editor story IG: 2 polaroid + bubble chat                         (2 foto)
    .tmplcurl     Profil gelap + 2 polaroid + kertas terkelupas                     (2 foto)
    .tmplshare    Share sheet iPhone: 3 foto, orang keluar dari kartu               (3 foto)
    .tmplsobek    3 panel kertas sobek (hitam putih - warna - hitam putih)          (3 foto)
    .tmplmaps     Peta + frame HP + menu story + dock                               (2 foto)

  Teks sengaja sedikit (1-3 isian), sisanya otomatis / bisa diubah lewat isian opsional.
  Template bertanda cutout: orang dipotong (hapus background) kalau layanan hapus-bg jalan; kalau gagal tetap jadi (fallback foto utuh).
*/
module.exports = function build(H) {
    const { Canvas, FONT, roundPath, igBox, igText, igIcon, drawCover, blurCanvas, wrapLines } = H
    const MED = "EstetikMed", LORA = "EstetikLora"

    /* ---------------- helper umum ---------------- */
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
    const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
    const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) }
    const msgs = (s, def) => { const a = String(s || "").split("/").map((x) => x.trim()).filter(Boolean); return a.length ? a : def }
    const T = (ctx, str, x, y, o = {}) => { if (!str) return 0; ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha; const w = igText(ctx, str, x, y, { font: MED, ...o }); ctx.restore(); return w }

    // foto isi kotak (cover) dengan fokus vertikal fy (0 = atas, 1 = bawah) supaya wajah tidak terpotong
    function crop(ctx, img, x, y, w, h, r = 0, fy = 0.3, zoom = 1, fx = 0.5) {
        const sc = Math.max(w / img.width, h / img.height) * zoom, dw = img.width * sc, dh = img.height * sc
        ctx.save()
        if (r) roundPath(ctx, x, y, w, h, r); else { ctx.beginPath(); ctx.rect(x, y, w, h) }
        ctx.clip(); ctx.drawImage(img, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh); ctx.restore()
    }
    function gray(img, W, H2, fy = 0.3, contrast = 1.12, bright = 0) {
        const c = Canvas.createCanvas(W, H2), x = c.getContext("2d")
        crop(x, img, 0, 0, W, H2, 0, fy)
        const d = x.getImageData(0, 0, W, H2), p = d.data
        for (let i = 0; i < p.length; i += 4) { const g = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = clamp((g - 128) * contrast + 128 + bright, 0, 255) }
        x.putImageData(d, 0, 0); return c
    }
    // kotak pembatas orang di PNG hasil hapus-bg (supaya ukuran/posisi pas walau fotonya punya banyak ruang kosong)
    function bbox(cut) {
        const w = 200, h = Math.max(1, Math.round(200 * cut.height / cut.width)), c = Canvas.createCanvas(w, h), x = c.getContext("2d")
        x.drawImage(cut, 0, 0, w, h)
        const p = x.getImageData(0, 0, w, h).data
        let x0 = w, y0 = h, x1 = 0, y1 = 0
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (p[(j * w + i) * 4 + 3] > 40) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j }
        if (x1 <= x0 || y1 <= y0) return { sx: 0, sy: 0, sw: cut.width, sh: cut.height }
        const k = cut.width / w
        return { sx: x0 * k, sy: y0 * k, sw: (x1 - x0 + 1) * k, sh: (y1 - y0 + 1) * k }
    }
    // gambar orang (cutout) muat di kotak, rata bawah-tengah (anchor "bottom") atau tengah ("center")
    function person(ctx, cut, box, anchor = "bottom") {
        const b = bbox(cut), sc = Math.min(box.w / b.sw, box.h / b.sh), dw = b.sw * sc, dh = b.sh * sc
        const dx = box.x + (box.w - dw) / 2, dy = anchor === "bottom" ? box.y + box.h - dh : box.y + (box.h - dh) / 2
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8
        ctx.drawImage(cut, b.sx, b.sy, b.sw, b.sh, dx, dy, dw, dh); ctx.restore()
        return { x: dx, y: dy, w: dw, h: dh }
    }
    // latar = foto di-blur penuh (+ lapisan warna). Dipakai ukuran desain (736 lebar) -> digambar di ctx yang sudah di-scale
    function blurBg(ctx, img, Wd, Hd, W, H2, wash, strength = 16) {
        const raw = Canvas.createCanvas(W, H2); drawCover(raw.getContext("2d"), img, W, H2)
        ctx.drawImage(blurCanvas(raw, W, H2, strength), 0, 0, Wd, Hd)
        if (wash) { ctx.fillStyle = wash; ctx.fillRect(0, 0, Wd, Hd) }
    }
    function star(ctx, cx, cy, r, col) { ctx.save(); ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * k, cy + Math.sin(a) * k) } ctx.closePath(); ctx.fill(); ctx.restore() }
    function moon(ctx, cx, cy, r, col) { ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(cx + r * 0.55, cy - r * 0.35, r * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
    function rot(ctx, cx, cy, ang, fn) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); fn(); ctx.restore() }

    // bubble chat: pill dengan teks; align left (x = tepi kiri) / right (x = tepi kanan). Return tinggi.
    function bubble(ctx, str, x, y, o = {}) {
        const { bg = "#1d7cf2", fg = "#fff", size = 22, maxW = 420, align = "left", padX = 20, padY = 12, font = MED, weight = "normal" } = o
        let sz = size; const set = () => { ctx.font = `${weight} ${sz}px ${font}, ${FONT}` }
        set(); while (sz > 9 && ctx.measureText(str).width > maxW - padX * 2) { sz--; set() }
        const w = ctx.measureText(str).width + padX * 2, h = sz + padY * 2
        const bx = align === "right" ? x - w : align === "center" ? x - w / 2 : x
        ctx.save(); roundPath(ctx, bx, y, w, h, Math.min(h / 2, o.r || h / 2.3)); ctx.fillStyle = bg; ctx.fill(); ctx.restore()
        ctx.save(); ctx.font = `${weight} ${sz}px ${font}, ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = fg; ctx.fillText(str, bx + padX, y + h / 2 + 1); ctx.restore()
        return h
    }
    const stack = (ctx, arr, x, y, o = {}, gap = 8) => { let cy = y; for (const s of arr) cy += bubble(ctx, s, x, cy, o) + gap; return cy }
    const BLUE = { bg: "#1b7ef7", fg: "#fff" }, DARK = { bg: "#202124", fg: "#fff" }, LIGHT = { bg: "#e9e9ec", fg: "#111" }

    function polaroid(ctx, img, cx, cy, w, h, ang, o = {}) {
        const { padS = 16, padT = 16, padB = 62, fy = 0.3, zoom = 1, frame = "#f8f8f6" } = o
        rot(ctx, cx, cy, ang, () => {
            igBox(ctx, -w / 2, -h / 2, w, h, 5, frame, { shadow: 0.35, blur: 26 })
            crop(ctx, img, -w / 2 + padS, -h / 2 + padT, w - padS * 2, h - padT - padB, 2, fy, zoom)
        })
    }
    function tag(ctx, str, x, y, o = {}) { return bubble(ctx, str, x, y, { bg: "#1c1c1e", fg: "#fff", size: 26, padX: 22, padY: 12, font: FONT, weight: "bold", r: 14, maxW: 300, ...o }) }

    function die(ctx, cx, cy, s, ang, o = {}) {
        const { body = "#f5f5f5", pip = "#151515", n = 5 } = o
        const P = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[n]
        rot(ctx, cx, cy, ang, () => {
            ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = s * 0.2; ctx.shadowOffsetY = s * 0.08
            roundPath(ctx, -s / 2, -s / 2, s, s, s * 0.2)
            const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); g.addColorStop(0, body); g.addColorStop(1, body === "#f5f5f5" ? "#cfcfd2" : body)
            ctx.fillStyle = g; ctx.fill(); ctx.restore()
            ctx.fillStyle = pip
            for (const k of P) { ctx.beginPath(); ctx.arc(((k % 3) - 1) * s * 0.27, (Math.floor(k / 3) - 1) * s * 0.27, s * 0.075, 0, Math.PI * 2); ctx.fill() }
        })
    }

    // ikon menu story IG (Create, Boomerang, ...)
    function sIcon(ctx, kind, cx, cy, s, col) {
        ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.6, s * 0.075); ctx.lineCap = "round"; ctx.lineJoin = "round"
        const r = s * 0.5
        if (kind === "aa") { ctx.font = `bold ${s * 0.95}px ${MED}, ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("Aa", 0, 1) }
        else if (kind === "inf") { ctx.beginPath(); for (let t = 0; t <= Math.PI * 2 + 0.05; t += 0.08) { const k = 1 + Math.sin(t) ** 2, x = (r * 1.15 * Math.cos(t)) / k, y = (r * 1.15 * Math.sin(t) * Math.cos(t)) / k; t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) } ctx.stroke() }
        else if (kind === "layout") { roundPath(ctx, -r, -r, s, s, s * 0.14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r * 0.05, -r); ctx.lineTo(-r * 0.05, r); ctx.moveTo(-r * 0.05, 0); ctx.lineTo(r, 0); ctx.stroke() }
        else if (kind === "multi") { ctx.setLineDash([s * 0.12, s * 0.12]); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.stroke() }
        else if (kind === "level") { ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r * 1.05, 0); ctx.lineTo(r * 1.05, 0); ctx.stroke() }
        else if (kind === "photobooth") { for (const o of [[-4, 4], [0, 0], [4, -4]]) { roundPath(ctx, -r * 0.7 + o[0], -r * 0.7 + o[1], s * 0.7, s * 0.7, 4); ctx.stroke() } }
        else if (kind === "zoom") { for (const k of [1, 0.64]) { ctx.beginPath(); ctx.arc(0, 0, r * k, 0, Math.PI * 2); ctx.stroke() } ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill() }
        else if (kind === "hands") { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); roundPath(ctx, -r * 0.38, -r * 0.38, r * 0.76, r * 0.76, 3); ctx.fill() }
        else if (kind === "chev") { ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.25); ctx.lineTo(0, -r * 0.3); ctx.lineTo(r * 0.6, r * 0.25); ctx.stroke() }
        ctx.restore()
    }
    function storyMenu(ctx, x, y, step, o = {}) {
        const { col = "#fff", alpha = 0.92, size = 21, gap = 66 } = o
        const L = [["aa", "Create"], ["inf", "Boomerang"], ["layout", "Layout"], ["multi", "Multi-Capture"], ["level", "Level"], ["photobooth", "Photobooth"], ["zoom", "Superzoom"], ["hands", "Hands-Free"], ["chev", "Close"]]
        ctx.save(); ctx.globalAlpha = alpha; ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 6
        L.forEach(([k, t], i) => { const cy = y + i * step; sIcon(ctx, k, x, cy, size * 1.25, col); ctx.font = `normal ${size}px ${MED}, ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = col; ctx.fillText(t, x + gap * 0.62, cy + 1) })
        ctx.restore()
    }

    // kartu post Instagram (putih): header, foto, aksi, nav
    function igPost(ctx, img, x, y, w, h, o = {}) {
        const { user = "", fy = 0.3, zoom = 1, nav = 1 } = o
        igBox(ctx, x, y, w, h, 12, "#ffffff", { shadow: 0.28, blur: 26 })
        igIcon(ctx, "camera", x + 28, y + 26, 22, "#222", { lw: 1.6 })
        T(ctx, "Instagram", x + 48, y + 27, { font: LORA, style: "italic", weight: "bold", size: 17, color: "#222" })
        igIcon(ctx, "comment", x + w - 72, y + 27, 21, "#222", { lw: 1.6 }); igIcon(ctx, "send", x + w - 34, y + 26, 21, "#222", { lw: 1.6 })
        ctx.save(); ctx.beginPath(); ctx.arc(x + 28, y + 62, 14, 0, Math.PI * 2); ctx.clip(); crop(ctx, img, x + 14, y + 48, 28, 28, 0, 0.15, 2.2); ctx.restore()
        ctx.save(); ctx.beginPath(); ctx.arc(x + 28, y + 62, 15, 0, Math.PI * 2); ctx.strokeStyle = "#d9a3c4"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore()
        T(ctx, user, x + 52, y + 62, { size: 13, weight: "bold", color: "#333", maxW: w - 110 })
        const ph = h - 80 - (nav ? 86 : 52)
        crop(ctx, img, x + 7, y + 82, w - 14, ph, 0, fy, zoom)
        const ay = y + 82 + ph + 26
        igIcon(ctx, "heart", x + 28, ay, 24, "#e0245e", { fill: true }); igIcon(ctx, "comment", x + 62, ay, 22, "#222", { lw: 1.7 }); igIcon(ctx, "send", x + 95, ay, 22, "#222", { lw: 1.7 })
        if (nav === 2) igIcon(ctx, "bookmark", x + w - 28, ay, 22, "#222", { lw: 1.7 })
        if (nav) {
            const ny = y + h - 26
            ;["home", "search", "plus", "heart", "person"].slice(0, nav === 1 ? 3 : 5).forEach((k, i, a) => igIcon(ctx, k, x + (w / (a.length + 1)) * (i + 1), ny, 20, "#222", { lw: 1.8, fill: k === "home" }))
        }
    }
    function outlineName(ctx, str, x, y, size, maxW) {
        let sz = size; const set = () => { ctx.font = `bold ${sz}px ${FONT}` }
        set(); while (sz > 12 && ctx.measureText(str).width > maxW) { sz--; set() }
        const w = ctx.measureText(str).width
        ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.lineWidth = Math.max(2, sz * 0.045); ctx.strokeStyle = "#111"
        ctx.strokeText(str, x, y)
        const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "#fff"); g.addColorStop(0.42, "#fafafa"); g.addColorStop(0.5, "#444"); g.addColorStop(1, "#0b0b0b")
        ctx.fillStyle = g; ctx.fillText(str, x, y); ctx.restore()
    }

    /* ---------------- TEMPLATES ---------------- */
    const OUT = {}

    // ===== tmplig — Kim Gaeul style =====
    OUT.tmplig = {
        size: [1080, 1920], title: "Post IG + menu story (nama outline besar)",
        fields: ["nama"], optional: ["user", "baris2"],
        optionalHint: "user (username IG di kartu), baris2 (tulisan outline kedua, default sama dengan nama)",
        example: " WELPER,welper.id,KEREN", caption: "✨ Template IG jadi.",
        photos: [{ label: "foto kamu (tegak/portrait paling bagus)" }], radius: 0, cutout: true, multi: true, draw() {},
        render(ctx, d, t, imgs, W, H2, cut) {
            const S = W / 736, Hd = H2 / S, img = imgs[0], nama = String(d.nama).toUpperCase(), baris2 = String(d.baris2 || d.nama).toUpperCase(), user = String(d.user || d.nama).replace(/^@/, "").replace(/\s+/g, "").toLowerCase()
            ctx.save(); ctx.scale(S, S)
            if (cut) blurBg(ctx, img, 736, Hd, W, H2, "rgba(255,255,255,0.45)", 20); else { crop(ctx, img, 0, 0, 736, Hd, 0, 0.25); ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(0, 0, 736, Hd) }
            const g = ctx.createLinearGradient(0, 0, 330, 0); g.addColorStop(0, "rgba(35,35,45,0.5)"); g.addColorStop(1, "rgba(35,35,45,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, 330, Hd)
            if (!cut) { ctx.save(); igBox(ctx, 118, 215, 500, 930, 26, "#fff", { shadow: 0.35, blur: 30 }); crop(ctx, img, 118, 215, 500, 930, 26, 0.25); ctx.restore() }
            igPost(ctx, img, 44, 38, 298, 468, { user, fy: 0.2, nav: 1 })
            storyMenu(ctx, 78, 578, 74, { col: "#fff", alpha: 0.8, size: 22 })
            outlineName(ctx, nama, 96, 122, 64, 440); outlineName(ctx, baris2, 215, 184, 64, 440)
            if (cut) person(ctx, cut, { x: 80, y: 215, w: 580, h: Hd - 215 + 20 })
            igPost(ctx, img, 396, 790, 298, 468, { user, fy: 0.12, zoom: 1.7, nav: 2 })
            ctx.restore()
        }
    }

    // ===== tmplprofil — profil IG gelap + dadu =====
    OUT.tmplprofil = {
        size: [1080, 1920], title: "Profil IG gelap + orang keluar layar + dadu",
        fields: ["user"], optional: ["nama", "bio", "chat1", "chat2", "slogan"],
        optionalHint: "nama (nama lengkap), bio (pisah / = baris baru), chat1, chat2 (bubble biru), slogan (teks besar kiri bawah)",
        example: " vanflashed,Gilvan Navarez,Games. Edits. Grind./Digital Creativity,keren banget lu,oke terus,QUALITY NOT QUANTITY", caption: "✨ Profil estetik jadi.",
        photos: [{ label: "foto kamu (tegak/portrait paling bagus)" }], radius: 0, cutout: true, multi: true, draw() {},
        render(ctx, d, t, imgs, W, H2, cut) {
            const S = W / 736, Hd = H2 / S, img = imgs[0], user = String(d.user).replace(/^@/, "").replace(/\s+/g, "").toLowerCase()
            const rnd = rng(hash(user)), posts = 20 + Math.floor(rnd() * 400), fol = 800 + Math.floor(rnd() * 9000), fing = 300 + Math.floor(rnd() * 900)
            const fmt = (n) => n.toLocaleString("en-US")
            const nama = d.nama || user, bio = msgs(d.bio, ["Games. Edits. Grind.", "Digital Creativity."]).slice(0, 3)
            ctx.save(); ctx.scale(S, S)
            blurBg(ctx, img, 736, Hd, W, H2, "rgba(10,10,14,0.62)", 30)
            // layar HP
            igBox(ctx, 44, 66, 612, 1190, 34, "#0b0b0e", { shadow: 0.5, blur: 40 })
            T(ctx, "+", 92, 120, { size: 40, weight: "bold", color: "#fff", align: "center" })
            const uw = T(ctx, user, 345, 120, { size: 27, weight: "bold", color: "#fff", align: "center", maxW: 260 })
            ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(345 + uw / 2 + 10, 116); ctx.lineTo(345 + uw / 2 + 18, 124); ctx.lineTo(345 + uw / 2 + 26, 116); ctx.stroke(); ctx.restore()
            ctx.fillStyle = "#ff3040"; ctx.beginPath(); ctx.arc(453, 120, 6, 0, Math.PI * 2); ctx.fill()
            T(ctx, "@", 546, 120, { size: 30, weight: "bold", color: "#fff", align: "center" }); ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineCap = "round"; for (const dy of [-9, 0, 9]) { ctx.beginPath(); ctx.moveTo(598, 120 + dy); ctx.lineTo(626, 120 + dy); ctx.stroke() } ctx.restore()
            // avatar + note
            ctx.save(); ctx.beginPath(); ctx.arc(162, 262, 56, 0, Math.PI * 2); ctx.clip(); crop(ctx, img, 106, 206, 112, 112, 0, 0.12, 1.9); ctx.restore()
            ctx.save(); ctx.beginPath(); ctx.arc(162, 262, 62, 0, Math.PI * 2); ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore()
            bubble(ctx, "What's new?", 112, 168, { bg: "#2c2c31", fg: "#aaa", size: 15, padX: 14, padY: 10 })
            ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(206, 296, 13, 0, Math.PI * 2); ctx.fill(); T(ctx, "+", 206, 296, { size: 20, weight: "bold", color: "#111", align: "center" })
            T(ctx, nama, 245, 213, { size: 17, weight: "bold", color: "#fff", maxW: 270 })
            ;[[posts, "posts", 247], [fol, "followers", 360], [fing, "following", 497]].forEach(([n, l, x]) => { T(ctx, fmt(n), x, 246, { size: 22, weight: "bold", color: "#fff", align: "left" }); T(ctx, l, x, 270, { size: 16, color: "#cfcfd4" }) })
            T(ctx, "Personal blog", 108, 346, { size: 15, color: "#9a9aa0" })
            bio.forEach((b, i) => T(ctx, b, 112, 369 + i * 20, { size: 16, color: "#f2f2f4", maxW: 400 }))
            T(ctx, "@" + user + "  •  link.bio/" + user, 112, 369 + bio.length * 20, { size: 15, color: "#8ab4ff", maxW: 400 })
            igBox(ctx, 126, 458, 464, 60, 12, "#1b1b1f", { shadow: 0 }); T(ctx, "Professional dashboard", 142, 478, { size: 14, weight: "bold", color: "#e8e8ea" }); T(ctx, (20 + Math.floor(rnd() * 80)) + "." + Math.floor(rnd() * 9) + "K views in the last 30 days", 142, 500, { size: 13, color: "#4cd37a" })
            // dadu
            die(ctx, 66, 480, 104, -0.3, { body: "#111", pip: "#f2f2f2", n: 4 }); die(ctx, 640, 640, 118, 0.2, { n: 5 }); die(ctx, 712, 690, 70, -0.4, { n: 2 }); die(ctx, 640, 1048, 96, 0.35, { body: "#2a46d0", pip: "#e8eeff", n: 6 })
            // orang / fallback
            if (cut) person(ctx, cut, { x: 120, y: 450, w: 500, h: 700 })
            else rot(ctx, 365, 770, -0.05, () => { igBox(ctx, -190, -300, 380, 600, 22, "#fff", { shadow: 0.45, blur: 30 }); crop(ctx, img, -190, -300, 380, 600, 22, 0.25) })
            // teks
            const sl = String(d.slogan || "QUALITY NOT QUANTITY").toUpperCase().split(/\s+/).slice(0, 3)
            sl.forEach((w, i) => T(ctx, w, 26, 975 + i * 46, { font: FONT, weight: "bold", size: 50, color: "#fff", maxW: 200 }))
            T(ctx, "THE GOOD I DO", 432, 880, { font: FONT, weight: "bold", size: 25, color: "#fff" }); T(ctx, "IS GOOD.", 432, 904, { font: FONT, weight: "bold", size: 25, color: "#fff" })
            T(ctx, "THE BAD I DO IS", 520, 948, { font: FONT, weight: "bold", size: 25, color: "#fff" }); T(ctx, "LEGENDARY.", 520, 974, { font: FONT, weight: "bold", size: 25, color: "#fff" })
            T(ctx, "genuine", 482, 343, { font: FONT, weight: "bold", size: 30, color: "#fff" }); T(ctx, "+ rare.", 482, 370, { font: FONT, weight: "bold", size: 30, color: "#fff" })
            bubble(ctx, msgs(d.chat1, ["keren banget lu"])[0], 122, 580, { ...BLUE, size: 22 }); bubble(ctx, msgs(d.chat2, ["oke terus"])[0], 168, 628, { ...BLUE, size: 22 })
            // nav bawah
            ctx.fillStyle = "#050507"; ctx.fillRect(0, 1092, 736, Hd - 1092)
            ;["home", "camera", "send", "search"].forEach((k, i) => igIcon(ctx, k, 14 + i * 172, 1138, 42, "#fff", { lw: 2.4 }))
            ctx.fillStyle = "#ff3040"; ctx.beginPath(); ctx.arc(384, 1152, 6, 0, Math.PI * 2); ctx.fill()
            ctx.save(); ctx.beginPath(); ctx.arc(708, 1138, 28, 0, Math.PI * 2); ctx.clip(); crop(ctx, img, 680, 1110, 56, 56, 0, 0.12, 1.9); ctx.restore()
            ctx.fillStyle = "#f4f4f4"; roundPath(ctx, 240, 1218, 256, 8, 4); ctx.fill()
            ctx.restore()
        }
    }

    // ===== tmplsearch — pencarian IG, 2 kartu profil =====
    OUT.tmplsearch = {
        size: [1080, 1920], title: "Pencarian IG: 2 kartu profil + chat + keyboard",
        fields: ["nama1", "nama2"], optional: ["cari", "chat1", "chat2"],
        optionalHint: "cari (teks di kolom pencarian, default イケメン), chat1 (bubble kiri, pisah / = beberapa bubble), chat2 (bubble biru kanan)",
        example: " Davis,Dafka", caption: "✨ Template pencarian jadi.",
        photos: [{ label: "foto kamu/duo kamu (tegak/portrait paling bagus)" }], radius: 0, cutout: true, multi: true, draw() {},
        render(ctx, d, t, imgs, W, H2, cut) {
            const S = W / 736, Hd = H2 / S, img = imgs[0], n1 = d.nama1, n2 = d.nama2, hdl = (s) => "@" + String(s).toLowerCase().replace(/[^a-z0-9._]/g, "")
            ctx.save(); ctx.scale(S, S)
            if (cut) ctx.drawImage(gray(img, W, H2, 0.3, 1.2, -18), 0, 0, 736, Hd); else { crop(ctx, img, 0, 0, 736, Hd, 0, 0.3); ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(0, 0, 736, Hd) }
            let g = ctx.createLinearGradient(0, 0, 0, 280); g.addColorStop(0, "rgba(10,11,16,0.97)"); g.addColorStop(0.8, "rgba(10,11,16,0.93)"); g.addColorStop(1, "rgba(10,11,16,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, 736, 280)
            // header pencarian
            ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(78, 112); ctx.lineTo(30, 112); ctx.moveTo(52, 90); ctx.lineTo(28, 112); ctx.lineTo(52, 134); ctx.stroke(); ctx.restore()
            igBox(ctx, 110, 76, 592, 70, 20, "#25262c", { shadow: 0 }); igIcon(ctx, "search", 158, 110, 30, "#8b8d96", { lw: 2.2 })
            T(ctx, d.cari || "イケメン", 212, 111, { font: "EstetikCJK", size: 25, color: "#f1f1f3", maxW: 440 })
            ;[["For you", 24, "#c9cad0", "normal"], ["Accounts", 162, "#fff", "bold"], ["Reels", 327, "#c9cad0", "normal"]].forEach(([s, x, c, w]) => T(ctx, s, x, 214, { size: 22, color: c, weight: w }))
            ctx.fillStyle = "#fff"; ctx.fillRect(132, 256, 162, 3)
            // kartu profil
            const card = (cx, cy, w, h, ang, nm, reg) => rot(ctx, cx, cy, ang, () => {
                igBox(ctx, -w / 2, -h / 2, w, h, 26, "#fff", { shadow: 0.35, blur: 26 })
                ctx.save(); ctx.beginPath(); ctx.arc(0, -h / 2 + 18, 30, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.clip(); crop(ctx, img, -28, -h / 2 - 10, 56, 56, 0, 0.1, 2.2, reg); ctx.restore()
                star(ctx, -w / 2 + 46, -h / 2 + 76, 7, "#222"); T(ctx, String(nm).toUpperCase(), 6, -h / 2 + 76, { font: LORA, weight: "bold", size: 17, color: "#222", align: "center", maxW: w - 110 })
                T(ctx, hdl(nm), 0, -h / 2 + 98, { size: 11, color: "#aaa", align: "center" })
                ctx.fillStyle = "#e3e3e6"; roundPath(ctx, -w / 2 + 34, -h / 2 + 116, w - 68, 7, 3.5); ctx.fill(); roundPath(ctx, -w / 2 + 60, -h / 2 + 132, w - 120, 7, 3.5); ctx.fill()
                crop(ctx, img, -w / 2 + 14, -h / 2 + 156, w - 28, h - 190, 12, 0.5, 1.4, reg)
            })
            card(172, 505, 330, 330, -0.1, n1, 0.2); card(558, 360, 330, 330, 0.07, n2, 0.8)
            if (cut) person(ctx, cut, { x: 70, y: 270, w: 620, h: 850 })
            // chat
            const L = msgs(d.chat1, ["eh gas lahhh", n1 + " x " + n2, "best duo"]), R = msgs(d.chat2, ["comeback duo yay or nay"])
            stack(ctx, L.slice(0, 3), 56, 872, { ...DARK, size: 22 }, 6); stack(ctx, R.slice(0, 2), 700, 764, { ...BLUE, size: 23, align: "right" }, 6)
            // bar bawah + keyboard
            ctx.fillStyle = "#14151a"; ctx.fillRect(0, 1112, 736, Hd - 1112)
            T(ctx, "+", 44, 1155, { size: 50, color: "#e9e9ee", align: "center", weight: "normal" }); igBox(ctx, 90, 1126, 452, 58, 29, "#24252b", { shadow: 0 }); ctx.fillStyle = "#e9e9ee"; ctx.fillRect(116, 1141, 3, 28)
            igIcon(ctx, "camera", 604, 1155, 36, "#e9e9ee", { lw: 2 })
            ctx.strokeStyle = "#e9e9ee"; ctx.lineWidth = 2.5; roundPath(ctx, 681, 1138, 12, 24, 6); ctx.stroke(); ctx.beginPath(); ctx.arc(687, 1158, 14, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke()
            ctx.fillStyle = "#2b2c31"; ctx.fillRect(0, 1196, 736, Hd - 1196)
            "QWERTYUIOP".split("").forEach((k, i) => { const x = 7 + i * 72.4; ctx.fillStyle = "#4b4c52"; roundPath(ctx, x, 1214, 63, 82, 9); ctx.fill(); T(ctx, k, x + 31.5, 1255, { size: 34, color: "#fff", align: "center" }) })
            ctx.restore()
        }
    }

    // ===== tmplduo — editor story, 2 polaroid =====
    OUT.tmplduo = {
        size: [1080, 1920], title: "Editor story IG: 2 polaroid + chat",
        fields: ["nama1", "nama2"], optional: ["chat1", "chat2"],
        optionalHint: "chat1 (bubble biru atas, pisah / = beberapa bubble), chat2 (bubble gelap kanan bawah)",
        example: " caramel,kinderv", caption: "✨ Template duo jadi.",
        photos: [{ label: "foto 1 (polaroid atas)" }, { label: "foto 2 (polaroid bawah)" }], radius: 0, multi: true, draw() {},
        render(ctx, d, t, imgs, W, H2) {
            const S = W / 736, Hd = H2 / S
            ctx.save(); ctx.scale(S, S)
            blurBg(ctx, imgs[0], 736, Hd, W, H2, "rgba(255,247,235,0.42)", 24)
            // toolbar atas
            ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(40, 64); ctx.lineTo(80, 64); ctx.arc(80, 82, 18, -Math.PI / 2, Math.PI / 2); ctx.lineTo(50, 100); ctx.stroke(); ctx.beginPath(); ctx.moveTo(52, 52); ctx.lineTo(40, 64); ctx.lineTo(52, 76); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(666, 68); ctx.lineTo(680, 82); ctx.lineTo(706, 54); ctx.stroke(); ctx.restore()
            ;[148, 238, 328, 418, 508, 598].forEach((x, i) => { ctx.save(); ctx.beginPath(); ctx.arc(x, 70, 27, 0, Math.PI * 2); if (i === 0) { ctx.fillStyle = "#fff"; ctx.fill() } else { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.6; ctx.stroke() } ctx.restore(); ctx.fillStyle = i === 0 ? "#222" : "#fff"; ctx.beginPath(); ctx.arc(x, 70, i === 3 ? 9 : 5, 0, Math.PI * 2); i === 3 ? ctx.stroke() : ctx.fill() })
            T(ctx, "Aa", 50, 190, { size: 40, weight: "bold", color: "#fff" }); sIcon(ctx, "layout", 50, 375, 46, "#fff"); sIcon(ctx, "multi", 50, 470, 46, "#fff"); sIcon(ctx, "level", 50, 562, 46, "#fff")
            // polaroid 1 + stiker es kopi
            polaroid(ctx, imgs[0], 440, 452, 505, 395, 0.04, { padB: 66, fy: 0.25 })
            tag(ctx, d.nama1, 468, 578)
            ctx.save(); ctx.translate(606, 250); ctx.rotate(0.06)
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-30, -130); ctx.lineTo(-48, -12); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(-60, -10); ctx.lineTo(60, -10); ctx.lineTo(48, 130); ctx.lineTo(-48, 130); ctx.closePath(); ctx.fillStyle = "rgba(255,255,255,0.72)"; ctx.fill()
            const cg = ctx.createLinearGradient(0, 10, 0, 130); cg.addColorStop(0, "#d9a066"); cg.addColorStop(1, "#b9753a"); ctx.beginPath(); ctx.moveTo(-56, 12); ctx.lineTo(56, 12); ctx.lineTo(48, 130); ctx.lineTo(-48, 130); ctx.closePath(); ctx.fillStyle = cg; ctx.fill()
            roundPath(ctx, -64, -22, 128, 16, 6); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore()
            // polaroid 2 + kamera
            polaroid(ctx, imgs[1], 230, 845, 390, 470, -0.07, { padB: 70, fy: 0.25 })
            tag(ctx, d.nama2, 262, 962)
            rot(ctx, 138, 972, -0.06, () => { igBox(ctx, -104, -52, 208, 104, 12, "#bfc0c4", { shadow: 0.4, blur: 16 }); ctx.fillStyle = "#151516"; roundPath(ctx, -104, 10, 208, 42, 12); ctx.fill(); ctx.fillStyle = "#d4d5d8"; roundPath(ctx, -104, -52, 208, 66, 12); ctx.fill()
                for (const [r2, c] of [[40, "#2a2a2d"], [32, "#101012"], [20, "#2d3b57"]]) { ctx.beginPath(); ctx.arc(0, 4, r2, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill() } ctx.fillStyle = "#2b2b2e"; roundPath(ctx, -92, -44, 36, 14, 4); ctx.fill() })
            stack(ctx, msgs(d.chat1, ["hari ini gabut banget", "kamu lagi ngapain?"]).slice(0, 3), 16, 228, { ...BLUE, size: 24, maxW: 440 }, 8)
            stack(ctx, msgs(d.chat2, ["sama, mending jalan yuk", "gas besok ya"]).slice(0, 3), 392, 700, { ...DARK, size: 22, maxW: 330 }, 8)
            // strip app + keyboard
            ctx.fillStyle = "rgba(30,30,34,0.92)"; ctx.fillRect(0, 1112, 736, 94)
            ;["#fff", "#2f8cf5", "#111", "#1a1a1c", "#ff3b6b", "#1b8cf0", "#e8c48f"].forEach((c, i) => { igBox(ctx, 24 + i * 100, 1128, 62, 62, 18, c, { shadow: 0 }); ctx.fillStyle = i === 3 ? "#33d17a" : "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.arc(55 + i * 100, 1159, i === 0 ? 14 : 9, 0, Math.PI * 2); i === 3 ? ctx.stroke() : ctx.fill() })
            ctx.fillStyle = "#2a2b2f"; ctx.fillRect(0, 1206, 736, Hd - 1206)
            "QWERTYUIOP".split("").forEach((k, i) => { const x = 7 + i * 72.4; ctx.fillStyle = "#5a5b61"; roundPath(ctx, x, 1222, 63, 78, 9); ctx.fill(); T(ctx, k, x + 31.5, 1261, { size: 33, color: "#fff", align: "center" }) })
            ctx.restore()
        }
    }

    // ===== tmplcurl — profil gelap + 2 polaroid + kertas terkelupas =====
    OUT.tmplcurl = {
        size: [1080, 1920], title: "Profil gelap + 2 polaroid + kertas terkelupas",
        fields: ["nama"], optional: ["chat1", "chat2", "ketik"],
        optionalHint: "chat1, chat2 (2 bubble putih di tengah), ketik (teks di kolom pesan bawah)",
        example: " Lyonn,baby baby,you're super adorable,can i kiss you", caption: "✨ Template profil jadi.",
        photos: [{ label: "foto 1 (polaroid kanan atas)" }, { label: "foto 2 (polaroid kiri bawah)" }], radius: 0, multi: true, draw() {},
        render(ctx, d, t, imgs, W, H2) {
            const S = W / 736, Hd = H2 / S, nama = d.nama, user = String(nama).toLowerCase().replace(/[^a-z0-9._]/g, ""), rnd = rng(hash(nama))
            const fmt = (n) => n.toLocaleString("id-ID")
            ctx.save(); ctx.scale(S, S)
            ctx.fillStyle = "#121318"; ctx.fillRect(0, 0, 736, Hd); ctx.save(); ctx.globalAlpha = 0.28; blurBg(ctx, imgs[0], 736, Hd, W, H2, null, 30); ctx.restore()
            const vg = ctx.createRadialGradient(368, 560, 120, 368, 560, 900); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, 736, Hd)
            // profil
            ctx.save(); ctx.beginPath(); ctx.arc(118, 158, 70, 0, Math.PI * 2); ctx.clip(); crop(ctx, imgs[0], 48, 88, 140, 140, 0, 0.12, 1.9); ctx.restore()
            ctx.save(); ctx.beginPath(); ctx.arc(118, 158, 80, 0, Math.PI * 2); ctx.strokeStyle = "#3b3c44"; ctx.lineWidth = 4; ctx.stroke(); ctx.restore()
            bubble(ctx, "Catatan...", 48, 56, { bg: "#2d2e34", fg: "#bdbdc4", size: 19, padX: 18, padY: 14 })
            ctx.fillStyle = "#1f8fff"; ctx.beginPath(); ctx.arc(172, 202, 18, 0, Math.PI * 2); ctx.fill(); T(ctx, "+", 172, 202, { size: 26, weight: "bold", color: "#fff", align: "center" })
            ;[[102 + Math.floor(rnd() * 300), "postingan", 312], [1000 + Math.floor(rnd() * 9000), "pengikut", 470], [300 + Math.floor(rnd() * 1500), "mengikuti", 630]].forEach(([n, l, x]) => { T(ctx, fmt(n), x, 108, { size: 27, weight: "bold", color: "#fff", align: "center" }); T(ctx, l, x, 146, { size: 21, color: "#cfd0d6", align: "center" }) })
            T(ctx, nama, 32, 272, { size: 21, weight: "bold", color: "#fff", maxW: 330 }); T(ctx, "Digital Creativity • Aesthetic", 32, 306, { size: 19, color: "#e6e6ea", maxW: 330 })
            T(ctx, "@" + user, 32, 342, { size: 19, color: "#8ab4ff", maxW: 330 })
            igBox(ctx, 24, 547, 672, 76, 16, "#1c1d23", { shadow: 0 }); igBox(ctx, 24, 676, 672, 62, 16, "#1c1d23", { shadow: 0 })
            ;[[60, 880, 66], [358, 880, 66], [646, 880, 66]].forEach(([x, y, r], i) => { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = "#23242b"; ctx.fill(); ctx.clip(); crop(ctx, imgs[i % 2], x - r + 8, y - r + 8, r * 2 - 16, r * 2 - 16, 0, 0.2, 1.6); ctx.restore(); ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = "#444650"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore() })
            // widget
            igBox(ctx, 275, 805, 310, 66, 33, "rgba(70,72,80,0.88)", { shadow: 0 }); moon(ctx, 312, 838, 13, "#fff"); T(ctx, "Do Not Disturb", 425, 838, { size: 18, color: "#ddd", align: "center" })
            igBox(ctx, 275, 890, 310, 66, 33, "rgba(70,72,80,0.88)", { shadow: 0 }); igIcon(ctx, "heart", 312, 922, 26, "#fff", { fill: true }); T(ctx, "peace", 425, 924, { size: 18, color: "#ddd", align: "center" })
            // polaroid
            polaroid(ctx, imgs[0], 506, 486, 350, 560, 0.09, { padS: 14, padT: 14, padB: 62, fy: 0.2, zoom: 1.08, frame: "#f4f4f2" })
            polaroid(ctx, imgs[1], 226, 780, 392, 490, -0.07, { padS: 14, padT: 14, padB: 54, fy: 0.2, frame: "#f4f4f2" })
            const ch = msgs(d.chat1 ? d.chat1 + (d.chat2 ? "/" + d.chat2 : "") : d.chat2, ["baby baby", "you're super adorable"])
            stack(ctx, ch.slice(0, 3), 203, 408, { ...LIGHT, size: 25, padX: 18, padY: 12 }, 8)
            // input + keyboard
            ctx.fillStyle = "#26272c"; ctx.fillRect(0, 985, 736, Hd - 985)
            igBox(ctx, 36, 1010, 42, 42, 8, "#4b4c52", { shadow: 0 }); T(ctx, "›", 57, 1030, { size: 36, color: "#fff", align: "center" })
            ctx.save(); ctx.strokeStyle = "#8a8b93"; ctx.lineWidth = 2; roundPath(ctx, 120, 1000, 560, 62, 31); ctx.stroke(); ctx.restore()
            const tw = T(ctx, d.ketik || "can i kiss you", 150, 1032, { size: 29, color: "#fff", maxW: 480 }); ctx.fillStyle = "#4f8dff"; ctx.fillRect(150 + tw + 4, 1013, 3, 38)
            "QWERTYUIOP".toLowerCase().split("").forEach((k, i) => { const x = 8 + i * 72.2; ctx.fillStyle = "#4b4c52"; roundPath(ctx, x, 1130, 62, 78, 9); ctx.fill(); T(ctx, k, x + 31, 1168, { size: 36, color: "#fff", align: "center" }) })
            // kertas terkelupas (page curl)
            ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 30; ctx.shadowOffsetX = -6; ctx.shadowOffsetY = -6
            let g = ctx.createLinearGradient(736, 900, 330, 1308); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#e4e4e8")
            ctx.beginPath(); ctx.moveTo(736, 930); ctx.bezierCurveTo(650, 960, 500, 1040, 326, 1308); ctx.lineTo(736, Hd); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.restore()
            g = ctx.createLinearGradient(736, 920, 440, 1160); g.addColorStop(0, "#ffffff"); g.addColorStop(0.45, "#d9d9de"); g.addColorStop(1, "#f3f3f5")
            ctx.beginPath(); ctx.moveTo(736, 930); ctx.bezierCurveTo(650, 960, 500, 1040, 326, 1308); ctx.bezierCurveTo(470, 1130, 600, 1030, 736, 990); ctx.closePath(); ctx.fillStyle = g; ctx.fill()
            ctx.restore()
        }
    }

    // ===== tmplshare — share sheet iPhone, 3 foto =====
    OUT.tmplshare = {
        size: [1080, 1434], title: "Share sheet iPhone (3 foto, orang keluar dari kartu)",
        fields: [], optional: [], example: "", caption: "✨ Template share jadi.",
        photos: [{ label: "foto kiri" }, { label: "foto tengah (orang utama, tegak/portrait paling bagus)" }, { label: "foto kanan" }],
        radius: 0, cutout: true, cutoutIndex: 1, multi: true, draw() {},
        render(ctx, d, t, imgs, W, H2, cut) {
            const S = W / 736, Hd = H2 / S
            ctx.save(); ctx.scale(S, S)
            ctx.fillStyle = "#7d7f86"; ctx.fillRect(0, 0, 736, Hd)
            ctx.save(); roundPath(ctx, 0, 0, 736, Hd + 80, 58); ctx.fillStyle = "#f4f4f6"; ctx.fill(); ctx.restore()
            // header
            crop(ctx, imgs[1], 52, 52, 116, 116, 16, 0.2, 1.1)
            T(ctx, "1 Photo Selected", 196, 76, { size: 25, weight: "bold", color: "#111" })
            igBox(ctx, 196, 108, 150, 56, 28, "#e8e8ec", { shadow: 0 }); T(ctx, "Options  ›", 271, 137, { size: 21, color: "#222", align: "center" })
            igBox(ctx, 626, 30, 80, 80, 40, "#fff", { shadow: 0.12, blur: 10 }); ctx.save(); ctx.strokeStyle = "#111"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(654, 58); ctx.lineTo(678, 82); ctx.moveTo(678, 58); ctx.lineTo(654, 82); ctx.stroke(); ctx.restore()
            // carousel
            crop(ctx, imgs[0], -60, 202, 210, 533, 40, 0.2); crop(ctx, imgs[2], 584, 202, 210, 533, 40, 0.2); crop(ctx, imgs[1], 167, 202, 400, 533, 40, 0.2)
            // app
            const apps = [["AirDrop", 42, "#2f8cf6", "#1b6fe0"], ["Messages", 245, "#4cd964", "#2fbf4a"], ["Mail", 391, "#3b9cf8", "#1f6fe8"], ["WhatsApp", 567, "#3dd868", "#1fb64a"]]
            apps.forEach(([n, x, c1, c2], i) => {
                const gr = ctx.createLinearGradient(0, 758, 0, 886); gr.addColorStop(0, c1); gr.addColorStop(1, c2); igBox(ctx, x, 758, 128, 128, 30, gr, { shadow: 0 })
                ctx.save(); ctx.translate(x + 64, 822); ctx.strokeStyle = "#fff"; ctx.fillStyle = "#fff"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round"
                if (i === 0) { for (const r of [48, 34]) { ctx.beginPath(); ctx.arc(0, 8, r, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke() } ctx.beginPath(); ctx.arc(0, 8, 9, 0, Math.PI * 2); ctx.fill() }
                else if (i === 1) { ctx.beginPath(); ctx.ellipse(0, -4, 40, 31, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-26, 22); ctx.lineTo(-38, 38); ctx.lineTo(-12, 28); ctx.fill() }
                else if (i === 2) { roundPath(ctx, -42, -28, 84, 58, 8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-40, -24); ctx.lineTo(0, 8); ctx.lineTo(40, -24); ctx.stroke() }
                else { ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-34, 36); ctx.lineTo(-38, 44); ctx.lineTo(-24, 40); ctx.stroke(); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-14, -14); ctx.quadraticCurveTo(-8, 22, 24, 14); ctx.stroke() }
                ctx.restore()
                T(ctx, n, x + 64, 916, { size: 21, color: "#333", align: "center", maxW: 150 })
            })
            ctx.fillStyle = "#d4d4d8"; ctx.fillRect(40, 962, 656, 2)
            if (cut) person(ctx, cut, { x: 150, y: 28, w: 440, h: 940 }, "center")
            ctx.restore()
        }
    }

    // ===== tmplsobek — 3 panel kertas sobek =====
    OUT.tmplsobek = {
        size: [1080, 1920], title: "3 panel kertas sobek (hitam putih - warna - hitam putih)",
        fields: ["nama"], optional: ["kutipan", "tanggal", "kredit", "label"],
        optionalHint: "kutipan (teks bawah), tanggal (default hari ini), kredit (tulisan 'Edit by'), label (teks kecil di atas nama, default NAME MEMBER)",
        example: " Gabriela Abigail,halo aku Ella,7 Agustus 2006,arm.project", caption: "✨ Template sobek jadi.",
        photos: [{ label: "foto atas (jadi hitam putih)" }, { label: "foto tengah (tetap berwarna)" }, { label: "foto bawah (jadi hitam putih)" }], radius: 0, multi: true, draw() {},
        render(ctx, d, t, imgs, W, H2) {
            const S = W / 736, Hd = H2 / S, rnd = rng(hash(d.nama) + 7)
            const tgl = d.tanggal || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })
            ctx.save(); ctx.scale(S, S)
            // garis sobekan (kiri-kanan) dengan getaran acak
            const torn = (a, b, amp) => { const pts = []; for (let x = -12; x <= 748; x += 7) pts.push([x, a + (b - a) * (x / 736) + Math.sin(x / 38) * amp * 0.5 + (rnd() - 0.5) * amp]); return pts }
            const clipBelow = (pts) => { ctx.beginPath(); ctx.moveTo(-12, Hd + 10); pts.forEach(([x, y], i) => ctx.lineTo(x, y)); ctx.lineTo(748, Hd + 10); ctx.closePath() }
            const gp = (img, y0, y1) => gray(img, Math.round(W), Math.round(((y1 - y0) + 120) * S), 0.25, 1.15)
            // panel atas
            ctx.drawImage(gp(imgs[0], 0, 520), 0, 0, 736, 520 + 120)
            let g = ctx.createLinearGradient(0, 0, 0, 330); g.addColorStop(0, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, 736, 330)
            // panel tengah
            const b1w = torn(412, 330, 9), b1p = torn(426, 344, 10)
            ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 14; clipBelow(b1w); ctx.fillStyle = "#fbfbfb"; ctx.fill(); ctx.restore()
            ctx.save(); clipBelow(b1p); ctx.clip(); crop(ctx, imgs[1], 0, 300, 736, 760, 0, 0.3); ctx.restore()
            // panel bawah
            const b2w = torn(838, 992, 9), b2p = torn(852, 1006, 10)
            ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 14; clipBelow(b2w); ctx.fillStyle = "#fbfbfb"; ctx.fill(); ctx.restore()
            ctx.save(); clipBelow(b2p); ctx.clip(); ctx.drawImage(gray(imgs[2], Math.round(W), Math.round((Hd - 800) * S), 0.2, 1.15), 0, 800, 736, Hd - 800); ctx.restore()
            g = ctx.createLinearGradient(0, 1040, 0, Hd); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.72)"); ctx.fillStyle = g; ctx.fillRect(0, 1040, 736, Hd - 1040)
            // teks
            ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 8
            T(ctx, String(d.label || "NAME MEMBER").toUpperCase(), 368, 196, { font: LORA, size: 15, color: "#fff", align: "center", maxW: 400 })
            T(ctx, String(d.nama).toUpperCase(), 368, 232, { font: LORA, weight: "bold", size: 42, color: "#fff", align: "center", maxW: 620 })
            T(ctx, "”", 368, 1126, { font: LORA, weight: "bold", size: 78, color: "#fff", align: "center" })
            const q = d.kutipan || `aku ingin ada disetiap harimu, halo aku ${d.nama}`
            ctx.font = `normal 21px ${LORA}`; wrapLines(ctx, q, 520, 3).forEach((ln, i) => T(ctx, ln, 368, 1172 + i * 28, { font: LORA, size: 21, color: "#fff", align: "center" }))
            ;[[352, 0.55], [362, 0.75], [372, 0.95]].forEach(([x, a]) => { ctx.globalAlpha = a; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, 1245, 7, 0, Math.PI * 2); ctx.fill() }); ctx.globalAlpha = 1
            T(ctx, tgl, 368, 1268, { size: 15, color: "#fff", align: "center" })
            if (d.kredit) T(ctx, "Edit by: " + d.kredit, 368, 1296, { size: 12, color: "#fff", align: "center", alpha: 0.8 })
            ctx.restore(); ctx.restore()
        }
    }

    // ===== tmplmaps — peta + frame HP + menu story + dock =====
    OUT.tmplmaps = {
        size: [1080, 1920], title: "Peta + frame HP + menu story + dock",
        fields: ["nama"], optional: ["tag", "judul"],
        optionalHint: "tag (label hijau di foto kecil, default sama dengan nama), judul (kata besar di belakang orang, default kata pertama nama)",
        example: " Nata,Kak Nata,Alone", caption: "✨ Template peta jadi.",
        photos: [{ label: "foto utama (tegak/portrait paling bagus)" }, { label: "foto kedua (foto kecil/polaroid)" }], radius: 0, cutout: true, multi: true, draw() {},
        render(ctx, d, t, imgs, W, H2, cut) {
            const S = W / 736, Hd = H2 / S, rnd = rng(hash(d.nama) + 3), big = String(d.judul || String(d.nama).split(/\s+/)[0]), tagS = d.tag || d.nama
            ctx.save(); ctx.scale(S, S)
            // peta
            ctx.fillStyle = "#eceff2"; ctx.fillRect(0, 0, 736, Hd)
            for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 3 === 0 ? "#cfe6c6" : "#e1eadc"; roundPath(ctx, rnd() * 640, rnd() * Hd, 90 + rnd() * 170, 70 + rnd() * 150, 24); ctx.fill() }
            ctx.strokeStyle = "#bcd8f0"; ctx.lineWidth = 46; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-40, Hd * 0.62); ctx.bezierCurveTo(240, Hd * 0.5, 460, Hd * 0.78, 790, Hd * 0.6); ctx.stroke()
            const road = (w, c, n) => { ctx.strokeStyle = c; ctx.lineWidth = w; for (let i = 0; i < n; i++) { ctx.beginPath(); const x0 = rnd() * 760 - 20, y0 = rnd() * Hd; ctx.moveTo(x0, y0); ctx.lineTo(x0 + (rnd() - 0.5) * 600, y0 + (rnd() - 0.5) * 600); ctx.stroke() } }
            road(20, "#ffffff", 14); road(9, "#f3d37e", 7); road(6, "#fff", 24)
            ;[[640, 290], [92, 470], [468, 860], [700, 1120], [40, 1040], [300, 160]].forEach(([x, y]) => { ctx.fillStyle = "#3b6fd8"; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill(); T(ctx, "M", x, y + 1, { size: 17, weight: "bold", color: "#fff", align: "center" }) })
            // bar atas
            igBox(ctx, 30, 44, 676, 84, 42, "rgba(255,255,255,0.96)", { shadow: 0.18, blur: 16 })
            ctx.fillStyle = "#555"; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(80 + (i % 3) * 16, 76 + Math.floor(i / 3) * 16, 4.5, 0, Math.PI * 2); ctx.fill() }
            T(ctx, "My Account", 136, 87, { size: 24, color: "#777" }); T(ctx, "›", 308, 86, { size: 28, color: "#777" }); T(ctx, "Posts", 340, 87, { size: 24, color: "#777" }); T(ctx, "›", 424, 86, { size: 28, color: "#777" }); T(ctx, "Today", 456, 87, { size: 24, weight: "bold", color: "#222" })
            // kata besar di belakang
            ctx.save(); ctx.globalAlpha = 0.95; T(ctx, big, 24, 330, { font: FONT, weight: "bold", size: 330, color: "#fff", maxW: 760 }); ctx.restore()
            // tile kontrol
            for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) { const x = 40 + c * 84, y = 276 + r * 84; igBox(ctx, x, y, 72, 72, 22, "#1c1c1e", { shadow: 0.2, blur: 8 }); ctx.strokeStyle = "#f2f2f2"; ctx.lineWidth = 3; ctx.beginPath(); if ((r + c) % 3 === 0) ctx.arc(x + 36, y + 36, 14, 0, Math.PI * 2); else if ((r + c) % 3 === 1) { roundPath(ctx, x + 22, y + 22, 28, 28, 6) } else { ctx.moveTo(x + 22, y + 36); ctx.lineTo(x + 50, y + 36); ctx.moveTo(x + 36, y + 22); ctx.lineTo(x + 36, y + 50) } ctx.stroke() }
            // foto kecil atas kanan (kartu dengan rel)
            igBox(ctx, 318, 124, 388, 36, 8, "#e9e9ec", { shadow: 0.2, blur: 12 }); igBox(ctx, 396, 160, 250, 262, 4, "#f7f7f7", { shadow: 0.35, blur: 22 }); crop(ctx, imgs[1], 408, 172, 226, 238, 0, 0.2)
            // HP gelap + earbuds
            rot(ctx, 640, 560, 0.03, () => { igBox(ctx, -84, -130, 168, 260, 26, "#3a3a3d", { shadow: 0.4, blur: 20 }); igBox(ctx, -62, -112, 78, 80, 18, "#232325", { shadow: 0 }); for (const [x, y] of [[-46, -96], [-22, -62], [-46, -62]]) { ctx.fillStyle = "#0e0e10"; ctx.beginPath(); ctx.arc(x + 12, y + 4, 12, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#555"; ctx.lineWidth = 2; ctx.stroke() }
                ctx.fillStyle = "#f5f5f5"; roundPath(ctx, 12, 24, 28, 74, 14); ctx.fill(); roundPath(ctx, 44, 40, 24, 64, 12); ctx.fill() })
            // frame HP besar
            rot(ctx, 372, 700, -0.32, () => {
                ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8
                roundPath(ctx, -270, -430, 540, 860, 80); ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fill(); ctx.restore()
                if (!cut) { ctx.save(); roundPath(ctx, -250, -410, 500, 820, 64); ctx.clip(); crop(ctx, imgs[0], -250, -410, 500, 820, 0, 0.25); ctx.restore() }
                ctx.strokeStyle = "#f7f7f7"; ctx.lineWidth = 26; roundPath(ctx, -264, -424, 528, 848, 78); ctx.stroke(); ctx.strokeStyle = "#cfcfd3"; ctx.lineWidth = 3; roundPath(ctx, -277, -437, 554, 874, 88); ctx.stroke()
            })
            storyMenu(ctx, 568, 633, 61, { col: "#26262b", alpha: 0.95, size: 21 })
            if (cut) person(ctx, cut, { x: 170, y: 190, w: 470, h: 1010 }, "bottom")
            // foto kiri bawah + tag
            igBox(ctx, 44, 828, 284, 344, 4, "#fafafa", { shadow: 0.4, blur: 24 }); crop(ctx, imgs[1], 54, 838, 264, 324, 0, 0.2, 1.05)
            igBox(ctx, 46, 1150, Math.min(250, 40 + String(tagS).length * 16), 40, 6, "#fff", { shadow: 0.2, blur: 8 }); T(ctx, tagS, 62, 1171, { font: "Courier", weight: "bold", size: 28, color: "#1c8f3a", maxW: 220 })
            igBox(ctx, 202, 1158, 150, 54, 10, "#2b4fe0", { shadow: 0.2, blur: 8 }); T(ctx, `${100 + Math.floor(rnd() * 90)} / ${30 + Math.floor(rnd() * 60)}`, 277, 1186, { size: 30, weight: "bold", color: "#fff", align: "center" })
            igBox(ctx, 468, 1158, 96, 54, 14, "#27c04a", { shadow: 0.2, blur: 8 }); T(ctx, String(1000 + Math.floor(rnd() * 8999)), 516, 1186, { size: 28, weight: "bold", color: "#fff", align: "center" })
            // dock
            igBox(ctx, 74, 1214, 590, 82, 26, "rgba(220,222,226,0.92)", { shadow: 0.25, blur: 14 })
            ;["#3b82f6", "#43a9f0", "#3f8bf7", "#2bd05a", "#fff", "#f7d544", "#2b6cb8"].forEach((c, i) => { const x = 92 + i * 72; igBox(ctx, x, 1224, 58, 58, 14, c, { shadow: 0 }); if (i === 4) { ctx.fillStyle = "#ef4444"; ctx.fillRect(x, 1224, 58, 18); T(ctx, new Date().toLocaleDateString("en-US", { month: "short", timeZone: "Asia/Jakarta" }).toUpperCase(), x + 29, 1233, { size: 11, weight: "bold", color: "#fff", align: "center" }); T(ctx, String(new Date().getDate()), x + 29, 1262, { size: 24, weight: "bold", color: "#222", align: "center" }) } })
            ctx.fillStyle = "#b0b2b8"; ctx.fillRect(600, 1226, 2, 54); igBox(ctx, 614, 1226, 38, 54, 10, "#9c9ea5", { shadow: 0 })
            ctx.restore()
        }
    }

    return OUT
}
