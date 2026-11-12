/*
  Template — kategori "Template" (bikin gambar testimoni dari template).
  SEMUA fitur ada di SATU file ini -> kalau mau update cukup timpa file ini.

  Cara pakai:
    .testimoni1WELPER ID,6283838637,@welperid,10.000
     (nama , nomor WA , user IG , nominal transaksi)  -> bot minta 3 foto: bukti transaksi (kanan), bukti transaksi done (kiri), foto spek akun (tengah)
    .testimoni2Metha Store   (template biru)  -> nama store otomatis ganti, bot minta 2 foto: bukti transaksi (kanan), bukti transaksi done (kiri)
    .testimoni3Sopieyy Store (template pink)  -> sama seperti di atas
  .tempel1 s/d .tempel6  (Tempel Foto) -> tanpa teks, langsung kirim foto sesuai urutan yang diminta bot, fotonya ditempel ke kotak hijau template
     (kotak boleh miring / perspektif: layar laptop, polaroid, dll). Template = media/tempel1.png..tempel6.png dengan lubang transparan.
  FOTO ESTETIK (command tmpl*, detail tiap template ada di source/FotoEstetik.js; ketik .tmpl untuk daftar lengkap):
  .tmplposter (dulu .estetik1) -> poster estetik: FOTO KAMU jadi latar penuh (orangnya diganti), semua teks bisa diganti:
     .tmplposter Stay With Me,akira_kun07,Xu_zin
     (judul , username IG , nama "Edit by")  + opsional berurutan: kata vertikal, pesan kecil, kutipan, tulisan bawah, kanji
     .tmplposter Stay With Me,akira_kun07,Xu_zin,FOREVER,,,HOME  (kosongkan yang tidak diubah pakai koma kosong). Hari & tanggal otomatis hari ini.
  .tmplhijau (dulu .estetik2) -> frame Instagram hijau (gaya Tighnari): foto kamu masuk ke dalam post + 3 tile zoom otomatis
     .tmplhijau Tighnari,GI x Kiehl's,_tinari.gixkiehl_,trungkien  (judul , sub , username IG , nama "art by") + opsional: kata raksasa, brand
  .tmplkuning (dulu .estetik3) -> frame Instagram kuning (gaya Flora): huruf besar FLORA, kata vertikal kuning, pill biru, badge
     .tmplkuning FLORA,jkt48.flora  + opsional berurutan: kata vertikal, follow, caption, badge, tulisan bawah
  .tmplig .tmplprofil .tmplsearch .tmplduo .tmplcurl .tmplshare .tmplsobek .tmplmaps -> template baru (1-3 foto, teks sedikit), lihat FotoEstetik.js
     contoh: .tmplig WELPER,welper.id,KEREN
  Nama lama .estetik1/.estetik2/.estetik3 tetap jalan (alias).
  Ketik "batal" kalau mau berhenti. Sesi hangus otomatis setelah 5 menit.

  Foto otomatis pas ke kotaknya (tidak gepeng): kalau rasio foto mirip kotak -> diisi penuh (crop tengah),
  kalau beda jauh (mis. screenshot HP tinggi masuk kotak lebar) -> ditampilkan utuh di tengah kotak.

  Tambah template baru: tambahkan satu entri di TEMPLATES (angka = nomor command, mis. .testimoni2),
  taruh gambarnya di folder /media, lalu daftarkan command-nya di source/MenuData.js (kategori Template).
  Pakai @napi-rs/canvas (sudah ada di package.json), template & font di-cache jadi ringan.
*/
const path = require("path")
const fs = require("fs")

let Canvas = null
try { Canvas = require("@napi-rs/canvas") } catch (e) { Canvas = null }

const MEDIA = path.join(__dirname, "..", "media")
const FONT = "TestiFont"
const SERIF = "TestiSerif"
const SESSION_TTL = 5 * 60 * 1000
const RUPIAH_PREFIX = true   // true: "10.000" tampil "Rp 10.000"

// koordinat dihitung dari ukuran asli tiap template. fields = urutan data di command, draw = cara menulis data ke gambar
const TEMPLATES = {
    testimoni1: {
        file: "testimoni-template.jpg",   // 1792x2400 (Dians Visual)
        title: "Dians Visual (Free Fire, 3 foto)",
        fields: ["nama", "nomor", "ig", "nominal"],
        example: "WELPER ID,6283838637,@welperid,10.000",
        // urutan foto yang diminta bot -> kotak tujuan di template
        photos: [
            { label: "bukti transaksi", slot: { x: 933, y: 661, w: 541, h: 963 } },        // kanan
            { label: "bukti transaksi done", slot: { x: 319, y: 661, w: 541, h: 963 } },   // kiri
            { label: "foto spek akun", slot: { x: 582, y: 986, w: 628, h: 310 } }          // tengah
        ],
        radius: 34,
        name: { cx: 890, top: 445, bottom: 540, maxW: 740 },                   // ganti teks "DIANS VISUAL"
        nominal: { cx: 576, cy: 1809, maxW: 520, size: 64, color: "#1b1f8f" },
        wa: { x: 405, cy: 1987, maxW: 640, size: 46 },
        ig: { x: 1152, cy: 1987, maxW: 370, size: 46 },
        draw(ctx, d, t) {
            drawTitle(ctx, d.nama, t.name)
            drawLine(ctx, d.nominal, t.nominal, { align: "center", color: t.nominal.color, shadow: false })
            drawLine(ctx, d.nomor, t.wa)
            drawLine(ctx, d.ig, t.ig)
        }
    },
    testimoni2: {
        file: "testimoni-template2.png", overlay: true,   // 736x736 (Metha Store, biru)
        title: "Metha Store (biru, 2 foto)",
        fields: ["nama"],
        example: "Metha Store",
        photos: [
            { label: "bukti transaksi", slot: { x: 315, y: 119, w: 203, h: 466 } },        // kanan
            { label: "bukti transaksi done", slot: { x: 91, y: 116, w: 204, h: 467 } }      // kiri
        ],
        radius: 22,
        draw(ctx, d) {
            drawBubbleLogo(ctx, d.nama, { cx: 372, cy: 668, maxW: 640, size: 120 })
            drawBanner(ctx, `Welcome to ${d.nama} |`, { right: 388, cy: 40, maxW: 298, size: 21 })
        }
    },
    testimoni3: {
        file: "testimoni-template3.png", overlay: true,   // 736x552 (Sopieyy Store, pink)
        title: "Sopieyy Store (pink, 2 foto)",
        fields: ["nama"],
        example: "Sopieyy Store",
        photos: [
            { label: "bukti transaksi", slot: { x: 477, y: 106, w: 204, h: 379 } },         // kanan
            { label: "bukti transaksi done", slot: { x: 254, y: 108, w: 203, h: 375 } }     // kiri
        ],
        radius: 30,
        draw(ctx, d) { drawPinkPlate(ctx, d.nama, { x: 262, y: 487, w: 298, h: 60, maxW: 250, size: 40 }) }
    },
    templqrs1: {
        file: "templqrs1.jpg",   // 735x554 (Healing Choi, scan to pay hitam putih)
        title: "Scan To Pay hitam-putih (Healing Choi)",
        fields: ["nama"], example: "Healing Choi",
        photos: [{ label: "foto QR", slot: { x: 116, y: 174, w: 300, h: 282 }, fit: "contain", inset: 8 }],
        radius: 18,
        draw(ctx, d) {
            plate(ctx, 54, 106, 224, 40, 20, "#ffffff", "#ececec", "#111111")
            plainText(ctx, d.nama, 166, 126, 190, 26, "#111111")
        }
    },
    templqrs2: {
        file: "templqrs2.jpg",   // 736x736 (awen store, kucing hitam-putih)
        title: "Scan Me kucing (awen store)",
        fields: ["nama"], example: "awen store",
        photos: [{ label: "foto QR", slot: { x: 176, y: 214, w: 388, h: 380 }, fill: "#ececec", fit: "contain", inset: 10 }],
        radius: 44,
        draw(ctx, d) { plainText(ctx, d.nama, 370, 680, 205, 30, "#ffffff", { font: SERIF, skew: -0.2 }) }
    },
    templqrs3: {
        file: "templqrs3.jpg",   // 736x736 (Rayy Store, krem)
        title: "Payment location krem (Rayy Store)",
        fields: ["nama"], example: "Rayy Store",
        photos: [{ label: "foto QR", slot: { x: 380, y: 368, w: 308, h: 312 }, fit: "contain", inset: 8 }],
        radius: 26,
        draw(ctx, d) {
            plainText(ctx, `${d.nama.toLowerCase()} payment location`, 433, 31, 330, 21, "#9a8461")
            const [a, b] = splitName(d.nama)
            plate(ctx, 434, 168, 228, 108, 30, "#fffaf0", "#eadcc0", "#a89068")
            bubble(ctx, a, 548, 224, 190, 82, SAND)
            plate(ctx, 402, 280, 226, 38, 19, "#ffffff", "#f1e8d6", "#a89068")
            plainText(ctx, b.toLowerCase(), 515, 299, 190, 26, "#5a4a33")
        }
    },
    templqrs4: {
        file: "templqrs4.png", overlay: true,   // 736x736 (Areu Store, pink kelinci)
        title: "Scan Here pink kelinci (Areu Store)",
        fields: ["nama"], example: "Areu Store",
        photos: [{ label: "foto QR", slot: { x: 62, y: 207, w: 316, h: 342 }, fit: "contain", inset: 10 }],
        radius: 40,
        draw(ctx, d) {
            plate(ctx, 378, 560, 352, 90, 45, "#ffe9f3", "#ffc6df", "#ee8fbd")
            bubble(ctx, d.nama, 554, 604, 310, 66, PINK)
        }
    },
    templqrs5: {
        file: "templqrs5.png", overlay: true,   // 736x736 (Xuan Store, pink ungu)
        title: "Scan Here pink ungu (Xuan Store)",
        fields: ["nama"], example: "Xuan Store",
        photos: [{ label: "foto QR", slot: { x: 286, y: 119, w: 360, h: 348 }, fit: "contain", inset: 10 }],
        radius: 40,
        draw(ctx, d) {
            const [a, b] = splitName(d.nama)
            plate(ctx, 14, 384, 284, 208, 46, "#ffe3f2", "#f6b4da", "#c46aa8")
            bubble(ctx, a, 156, 450, 236, 96, PINK2)
            bubble(ctx, b.toLowerCase(), 156, 537, 236, 82, PINK2)
        }
    },
    tmplposter: {
        // tidak pakai file template: foto jadi latar penuh, teks poster digambar lewat code (lihat drawEstetik)
        size: [1080, 1620],   // rasio 2:3 seperti poster aslinya (736x1104)
        title: "Poster estetik (orang dipotong, latar blur, teks bisa diganti)",
        fields: ["judul", "ig", "nama"],
        optional: ["kata", "pesan", "kutipan", "bawah", "kanji"],
        optionalHint: "kata (vertikal, default REMEMBER), pesan (paragraf kecil), kutipan (teks serif vertikal), bawah (default FROM HOME), kanji (default 和平相)",
        example: " Stay With Me,akira_kun07,Xu_zin",
        caption: "✨ Poster estetik jadi.",
        photos: [{ label: "foto orangnya (ukuran tegak/portrait paling bagus)", slot: { x: 0, y: 0, w: 1080, h: 1620 }, fit: "cover" }],
        radius: 0,
        tekBawahDiDepan: true,   // true = tulisan bawah (sosmed, FROM HOME, Edit by) di DEPAN orang seperti poster asli | false = semua teks di belakang orang (orang sama sekali tidak tertimpa)
        cutout: true,   // orang dipotong (hapus background) -> latar di-blur, sebagian teks di belakang orang
        draw(ctx, d, t, part) { drawEstetik(ctx, d, t, part) }
    },
    tmplhijau: {
        size: [1080, 1530],   // 736x1042 (frame Instagram hijau, gaya Tighnari)
        title: "Frame Instagram hijau (foto di dalam post + tile zoom)",
        fields: ["judul", "sub", "ig", "nama"],
        optional: ["kata", "brand"],
        optionalHint: "kata (tulisan raksasa di belakang, pisah spasi = 1 baris, default GEN SHIN IMP ACT), brand (tulisan kiri bawah, kosong = tidak ada)",
        example: " Tighnari,GI x Kiehl's,_tinari.gixkiehl_,trungkien",
        caption: "✨ Poster frame Instagram jadi.",
        photos: [{ label: "foto kamu (ukuran tegak/portrait paling bagus)" }],
        radius: 0,
        render: renderIgGreen,
        draw() {}
    },
    tmplkuning: {
        size: [900, 1600],   // 675x1200 (frame Instagram kuning, gaya Flora)
        title: "Frame Instagram kuning (huruf besar + kata vertikal)",
        fields: ["judul", "ig"],
        optional: ["kata", "follow", "caption", "badge", "bawah"],
        optionalHint: "kata (teks kuning vertikal kanan, pisah spasi = 1 baris, default LOE ITU PEN DEK), follow (pill biru & yang menyukai), caption, badge (default MAKE IT SIMPLE), bawah (tulisan paling bawah)",
        example: " FLORA,jkt48.flora,LOE ITU PEN DEK,arm.project",
        caption: "✨ Poster frame Instagram jadi.",
        photos: [{ label: "foto kamu (ukuran tegak/portrait paling bagus)" }],
        radius: 0,
        render: renderIgYellow,
        draw() {}
    },
    tempel1: {
        file: "tempel1.png", overlay: true,   // 736x1308 (iOS Photos + Spotify), kotak foto = lubang transparan
        title: "Galeri iPhone (layar penuh)",
        fields: [], example: "", caption: "Tempel foto jadi.",
        photos: [
            { label: "foto kamu", quad: [[232.0, 245.0], [735.0, 244.0], [735.0, 1130.0], [232.0, 1129.0]] }
        ],
        radius: 0,
        draw() {}
    },
    tempel2: {
        file: "tempel2.png", overlay: true,   // 736x736 (Instax mini 8), kotak foto = lubang transparan
        title: "Kamera Instax (hasil cetak keluar)",
        fields: [], example: "", caption: "Tempel foto jadi.",
        photos: [
            { label: "foto kamu", quad: [[224.0, 222.0], [543.0, 74.0], [651.0, 309.0], [333.0, 456.0]] }
        ],
        radius: 0,
        draw() {}
    },
    tempel3: {
        file: "tempel3.png", overlay: true,   // 736x1309 (Happy birthday), kotak foto = lubang transparan
        title: "Birthday polaroid (2 foto)",
        fields: [], example: "", caption: "Tempel foto jadi.",
        photos: [
            { label: "foto atas", quad: [[120.0, 271.0], [377.0, 243.0], [408.0, 514.0], [152.0, 543.0]] },
            { label: "foto bawah", quad: [[374.0, 713.0], [647.0, 774.0], [573.0, 1101.0], [300.0, 1040.0]] }
        ],
        radius: 0,
        draw() {}
    },
    tempel4: {
        file: "tempel4.png", overlay: true,   // 675x1200 (laptop selfie), kotak foto = lubang transparan
        title: "Layar laptop + selfie (hoodie putih)",
        fields: [], example: "", caption: "Tempel foto jadi.",
        photos: [
            { label: "foto layar laptop", quad: [[0.0, 211.0], [384.0, 329.0], [303.0, 681.0], [0.0, 717.0]] }
        ],
        radius: 0,
        draw() {}
    },
    tempel5: {
        file: "tempel5.png", overlay: true,   // 736x1308 (polaroid paperclip), kotak foto = lubang transparan
        title: "Polaroid di kertas bergaris (4 foto)",
        fields: [], example: "", caption: "Tempel foto jadi.",
        photos: [
            { label: "foto 1 (paling atas)", quad: [[204.0, 0.0], [461.0, 0.0], [399.0, 230.0], [161.0, 166.0]] },
            { label: "foto 2", quad: [[274.0, 357.0], [517.0, 321.0], [553.0, 565.0], [311.0, 601.0]] },
            { label: "foto 3", quad: [[225.0, 629.0], [462.0, 693.0], [399.0, 930.0], [161.0, 867.0]] },
            { label: "foto 4 (paling bawah)", quad: [[274.0, 1058.0], [517.0, 1022.0], [553.0, 1265.0], [310.0, 1301.0]] }
        ],
        radius: 0,
        draw() {}
    },
    tempel6: {
        file: "tempel6.png", overlay: true,   // 675x1200 (laptop selfie gelap), kotak foto = lubang transparan
        title: "Layar laptop + selfie (hitam)",
        fields: [], example: "", caption: "Tempel foto jadi.",
        photos: [
            { label: "foto layar laptop", quad: [[0.0, 100.0], [355.0, 314.0], [218.0, 669.0], [0.0, 627.0]] }
        ],
        radius: 0,
        draw() {}
    }
}

const sessions = new Map()   // "chat|sender" -> { tpl, data, photos:[Buffer], ts }
const keyOf = (m) => `${m.chat}|${m.sender}`
const sweep = () => { const now = Date.now(); for (const [k, s] of sessions) if (now - s.ts > SESSION_TTL) sessions.delete(k) }

/* ---------- canvas ---------- */
let fontReady = false
const imgCache = new Map()
async function loadTemplate(file) {
    if (!imgCache.has(file)) imgCache.set(file, await Canvas.loadImage(fs.readFileSync(path.join(MEDIA, file))))
    return imgCache.get(file)
}
function ensureFont() {
    if (fontReady) return
    try { Canvas.GlobalFonts.registerFromPath(path.join(MEDIA, "testimoni-font.ttf"), FONT) } catch (e) { console.log("[SetorTemplate] font gagal dimuat:", e.message) }
    try { Canvas.GlobalFonts.registerFromPath(path.join(MEDIA, "testimoni-serif.ttf"), SERIF) } catch (e) { console.log("[SetorTemplate] font serif gagal dimuat:", e.message) }
    for (const [file, fam] of [["estetik-poppins-medium.ttf", "EstetikMed"], ["estetik-lora.ttf", "EstetikLora"], ["estetik-cjk.otf", "EstetikCJK"]]) {
        try { Canvas.GlobalFonts.registerFromPath(path.join(MEDIA, file), fam) } catch (e) { console.log(`[SetorTemplate] font ${file} gagal dimuat:`, e.message) }
    }
    fontReady = true
}

function roundPath(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

// kecilkan font sampai teks muat di lebar maksimal
function fitFont(ctx, text, size, maxW, weight = "bold") {
    let s = size
    for (; s > 14; s -= 2) {
        ctx.font = `${weight} ${s}px ${FONT}`
        if (ctx.measureText(text).width <= maxW) break
    }
    return s
}

function drawPhoto(ctx, img, slot, radius, pad = 2, opt = {}) {
    const { x, y, w, h } = slot   // pad: foto dilebihkan sedikit biar tepi kotak tertutup
    ctx.save()
    roundPath(ctx, x - pad, y - pad, w + pad * 2, h + pad * 2, radius)
    ctx.clip()
    ctx.fillStyle = opt.fill || "#ffffff"
    ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2)
    const inset = opt.inset || 0
    const bx = x + inset, by = y + inset, bw = w - inset * 2, bh = h - inset * 2
    const diff = (img.width / img.height) / (bw / bh)
    if (opt.fit === "cover" || (opt.fit !== "contain" && diff >= 0.6 && diff <= 1.67)) {
        // rasio mirip -> isi penuh (cover)
        const sc = Math.max(bw / img.width, bh / img.height)
        const dw = img.width * sc, dh = img.height * sc
        ctx.drawImage(img, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh)
    } else {
        // rasio beda jauh / QR -> tampil utuh (contain), tidak gepeng & tidak terpotong
        const sc = Math.min(bw / img.width, bh / img.height)
        const dw = img.width * sc, dh = img.height * sc
        ctx.drawImage(img, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh)
    }
    ctx.restore()
}

// Foto ke kotak miring / perspektif (4 sudut: kiri-atas, kanan-atas, kanan-bawah, kiri-bawah).
// Foto di-crop tengah sesuai rasio kotak (cover) lalu dilipat ke kotak lewat mesh segitiga kecil-kecil.
function drawPhotoQuad(ctx, img, quad, pad = 4) {
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
    const [TL, TR, BR, BL] = quad
    // lebarkan kotak sedikit ke luar supaya tepi lubang template tertutup
    const cx = quad.reduce((t, p) => t + p[0], 0) / 4, cy = quad.reduce((t, p) => t + p[1], 0) / 4
    const grow = (p) => { const dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1; return [p[0] + dx / L * pad, p[1] + dy / L * pad] }
    const [A, B, C, D] = [TL, TR, BR, BL].map(grow)
    const qw = (d(TL, TR) + d(BL, BR)) / 2, qh = (d(TL, BL) + d(TR, BR)) / 2
    // crop sumber (cover)
    const ar = qw / qh
    let sw = img.width, sh = img.height
    if (sw / sh > ar) sw = sh * ar; else sh = sw / ar
    const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2
    const N = 16
    const pt = (u, v) => [
        (1 - v) * ((1 - u) * A[0] + u * B[0]) + v * ((1 - u) * D[0] + u * C[0]),
        (1 - v) * ((1 - u) * A[1] + u * B[1]) + v * ((1 - u) * D[1] + u * C[1])
    ]
    const tri = (s0, s1, s2, d0, d1, d2) => {
        // matriks affine: titik sumber (s) -> titik tujuan (d)
        const det = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1])
        if (!det) return
        const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / det
        const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / det
        const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / det
        const e = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / det
        const tx = d0[0] - a * s0[0] - c * s0[1], ty = d0[1] - b * s0[0] - e * s0[1]
        // segitiga tujuan dilebarkan 0.6px biar tidak ada garis halus antar segitiga
        const g = (p) => { const mx = (d0[0] + d1[0] + d2[0]) / 3, my = (d0[1] + d1[1] + d2[1]) / 3, dx = p[0] - mx, dy = p[1] - my, L = Math.hypot(dx, dy) || 1; return [p[0] + dx / L * 0.6, p[1] + dy / L * 0.6] }
        const [g0, g1, g2] = [d0, d1, d2].map(g)
        ctx.save()
        ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.lineTo(g2[0], g2[1]); ctx.closePath(); ctx.clip()
        ctx.setTransform(a, b, c, e, tx, ty)
        ctx.drawImage(img, 0, 0)
        ctx.restore()
    }
    ctx.save()
    ctx.fillStyle = "#ffffff"
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.lineTo(D[0], D[1]); ctx.closePath(); ctx.fill()
    ctx.restore()
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const u0 = i / N, u1 = (i + 1) / N, v0 = j / N, v1 = (j + 1) / N
        const s = (u, v) => [sx + u * sw, sy + v * sh]
        const P00 = pt(u0, v0), P10 = pt(u1, v0), P11 = pt(u1, v1), P01 = pt(u0, v1)
        tri(s(u0, v0), s(u1, v0), s(u1, v1), P00, P10, P11)
        tri(s(u0, v0), s(u1, v1), s(u0, v1), P00, P11, P01)
    }
}

function drawTitle(ctx, text, c) {
    const t = text.toUpperCase()
    const midY = (c.top + c.bottom) / 2
    const size = fitFont(ctx, t, 124, c.maxW, "bold")
    ctx.font = `bold ${size}px ${FONT}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.lineJoin = "round"
    const outline = Math.max(8, Math.round(size * 0.1))
    // tebal 3D (bawah)
    ctx.fillStyle = "#1411a8"; ctx.strokeStyle = "#1411a8"; ctx.lineWidth = outline
    for (let i = 14; i >= 6; i -= 2) { ctx.strokeText(t, c.cx, midY + i); ctx.fillText(t, c.cx, midY + i) }
    // outline biru tua
    ctx.strokeStyle = "#2a2fd6"; ctx.lineWidth = outline
    ctx.strokeText(t, c.cx, midY)
    // isi gradasi cyan -> biru
    const g = ctx.createLinearGradient(0, midY - size / 2, 0, midY + size / 2)
    g.addColorStop(0, "#9be8ff"); g.addColorStop(0.5, "#46b8ff"); g.addColorStop(1, "#1f7bea")
    ctx.fillStyle = g
    ctx.fillText(t, c.cx, midY)
    // garis tipis terang biar timbul
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 2
    ctx.strokeText(t, c.cx, midY - 1)
}

function drawLine(ctx, text, c, { align = "left", color = "#ffffff", shadow = true } = {}) {
    const size = fitFont(ctx, text, c.size, c.maxW)
    ctx.font = `bold ${size}px ${FONT}`
    ctx.textAlign = align
    ctx.textBaseline = "middle"
    const x = align === "center" ? c.cx : c.x
    const y = align === "center" ? c.cy : c.cy
    if (shadow) { ctx.fillStyle = "rgba(0,0,40,0.45)"; ctx.fillText(text, x + 2, y + 3) }
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
}

function drawBubbleLogo(ctx, text, c) {
    const size = fitFont(ctx, text, c.size, c.maxW)
    ctx.font = `bold ${size}px ${FONT}`
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"
    for (const [w, col] of [[size * 0.26, "#1d72ad"], [size * 0.19, "#ffffff"], [size * 0.07, "#2d7fd1"]]) {
        ctx.lineWidth = w; ctx.strokeStyle = col; ctx.strokeText(text, c.cx, c.cy)
    }
    const g = ctx.createLinearGradient(0, c.cy - size / 2, 0, c.cy + size / 2)
    g.addColorStop(0, "#3f86e0"); g.addColorStop(0.55, "#8fbcf0"); g.addColorStop(1, "#f4f9ff")
    ctx.fillStyle = g; ctx.fillText(text, c.cx, c.cy)
}

function drawBanner(ctx, text, c) {
    let s = c.size
    for (; s > 10; s--) { ctx.font = `bold ${s}px ${SERIF}`; if (ctx.measureText(text).width <= c.maxW) break }
    ctx.textAlign = "right"; ctx.textBaseline = "middle"
    ctx.fillStyle = "#f2f8ff"; ctx.fillText(text, c.right, c.cy)
}

function drawPinkPlate(ctx, text, c) {
    ctx.save()
    roundPath(ctx, c.x, c.y, c.w, c.h, c.h / 2)
    const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h)
    g.addColorStop(0, "#ffe6f1"); g.addColorStop(1, "#ffbfdb")
    ctx.fillStyle = g; ctx.fill()
    ctx.lineWidth = 5; ctx.strokeStyle = "#ffffff"; ctx.stroke()
    ctx.lineWidth = 2; ctx.strokeStyle = "#ff8fbf"; ctx.stroke()
    ctx.restore()
    const size = fitFont(ctx, text, c.size, c.maxW)
    ctx.font = `bold ${size}px ${FONT}`
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2
    ctx.lineWidth = 6; ctx.strokeStyle = "#ffffff"; ctx.strokeText(text, cx, cy)
    ctx.fillStyle = "#ff5c9e"; ctx.fillText(text, cx, cy)
}

// teks gelembung bertumpuk (outline luar, putih, outline dalam, isi gradasi)
function bubble(ctx, text, cx, cy, maxW, size, st) {
    const sz = fitFont(ctx, text, size, maxW)
    ctx.font = `bold ${sz}px ${FONT}`
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"
    for (const [k, col] of [[0.24, st.outer], [0.17, "#ffffff"], [st.inner ? 0.06 : 0, st.inner]]) {
        if (!k || !col) continue
        ctx.lineWidth = sz * k; ctx.strokeStyle = col; ctx.strokeText(text, cx, cy)
    }
    const g = ctx.createLinearGradient(0, cy - sz / 2, 0, cy + sz / 2)
    for (const [o, col] of st.stops) g.addColorStop(o, col)
    ctx.fillStyle = g; ctx.fillText(text, cx, cy)
}

function plate(ctx, x, y, w, h, r, fill1, fill2, line) {
    ctx.save()
    roundPath(ctx, x, y, w, h, r)
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, fill1); g.addColorStop(1, fill2)
    ctx.fillStyle = g; ctx.fill()
    ctx.lineWidth = 6; ctx.strokeStyle = "#ffffff"; ctx.stroke()
    ctx.lineWidth = 2.5; ctx.strokeStyle = line; ctx.stroke()
    ctx.restore()
}

// "Rayy Store" -> ["Rayy", "Store"]; satu kata saja -> kata kedua "Store"
const splitName = (n) => { const w = String(n).trim().split(/\s+/); return [w[0], w.slice(1).join(" ") || "Store"] }

function plainText(ctx, text, cx, cy, maxW, size, color, { font = FONT, skew = 0, align = "center" } = {}) {
    let sz = size
    for (; sz > 10; sz--) { ctx.font = `bold ${sz}px ${font}`; if (ctx.measureText(text).width <= maxW) break }
    ctx.save()
    ctx.translate(cx, cy); if (skew) ctx.transform(1, 0, skew, 1, 0, 0)
    ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillStyle = color
    ctx.fillText(text, 0, 0)
    ctx.restore()
}

/* ---------- template ESTETIK (poster: foto latar + teks) ---------- */
function wrapLines(ctx, text, maxW, maxLines) {
    const words = String(text).split(/\s+/).filter(Boolean)
    const lines = []
    let cur = ""
    for (const w of words) {
        const t = cur ? cur + " " + w : w
        if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w } else cur = t
    }
    if (cur) lines.push(cur)
    if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s,.]*$/, "") + "…" }
    return lines
}

// part: "behind" = teks yang tampil DI BELAKANG orang | "front" = teks di DEPAN orang | "all" = semuanya (tanpa potongan orang)
function drawEstetik(ctx, d, t, part = "all") {
    const S = t.size[0] / 736, W = 736, H = 1104
    const behind = part !== "front", front = part !== "behind"
    const tz = "Asia/Jakarta", now = new Date()
    const hari = now.toLocaleDateString("en-US", { weekday: "long", timeZone: tz }).toUpperCase()
    const tgl = now.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: tz }).replace(/\//g, ".")
    const ig = String(d.ig || "").replace(/^@/, "").replace(/\s+/g, "").toUpperCase()
    const words = String(d.judul || "").trim().split(/\s+/).filter(Boolean)
    const big = (words[0] || "").toUpperCase(), small = words.slice(1).join(" ").toUpperCase()
    const kata = (d.kata || "REMEMBER").toUpperCase()
    const pesan = d.pesan || "Sometimes it's okay to not be okay, we need to be disappointed to know how to be happy."
    const kutipan = d.kutipan || "when you feel anxious, look at your heart, come to me you are still the best"
    const bawah = (d.bawah || "FROM HOME").toUpperCase()
    const kanji = d.kanji || "和平相"

    // tanpa potongan orang (foto tajam): gelapkan tipis + bayangan bawah supaya teks putih tetap kebaca di foto terang
    if (part === "all") {
        ctx.save()
        ctx.fillStyle = "rgba(0,0,0,0.10)"; ctx.fillRect(0, 0, t.size[0], t.size[1])
        const g = ctx.createLinearGradient(0, t.size[1] * 0.55, 0, t.size[1])
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.42)")
        ctx.fillStyle = g; ctx.fillRect(0, t.size[1] * 0.55, t.size[0], t.size[1] * 0.45)
        ctx.restore()
    }

    ctx.save()
    ctx.scale(S, S)
    const shadow = (on = true) => {
        ctx.shadowColor = on ? "rgba(0,0,0,0.40)" : "transparent"
        ctx.shadowBlur = on ? 8 * S : 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = on ? 2 * S : 0
    }
    // satu fungsi teks: font, ukuran (otomatis mengecil sampai muat maxW), perataan, rotasi, transparansi
    const text = (str, x, y, { font = FONT, size = 20, maxW = 0, align = "left", color = "#fff", rot = 0, alpha = 1, weight = "bold", sh = true } = {}) => {
        if (!str) return
        let sz = size
        ctx.save()
        const fam = font === "EstetikCJK" ? `EstetikCJK, ${FONT}` : font
        const setF = () => { ctx.font = `${weight} ${sz}px ${fam}` }
        setF()
        if (maxW) for (; sz > 8 && ctx.measureText(str).width > maxW; sz--) setF()
        ctx.translate(x, y); if (rot) ctx.rotate(rot)
        ctx.textAlign = align; ctx.textBaseline = "middle"
        ctx.globalAlpha = alpha; ctx.fillStyle = color
        shadow(sh); ctx.fillText(str, 0, 0)
        ctx.restore()
    }
    const UP = -Math.PI / 2   // teks vertikal: dibaca dari bawah ke atas

    if (behind) {
        // kiri atas: kanji, hari, tanggal, IG
        text(kanji, 52, 268, { font: "EstetikCJK", size: 56, maxW: 230 })
        ctx.fillStyle = "#fff"; shadow(); ctx.fillRect(62, 322, 62, 17); shadow(false)
        text(hari, 132, 331, { size: 24, maxW: 150 })
        text(tgl, 62, 366, { font: "EstetikMed", size: 15, weight: "normal" })
        text(ig ? "INSTAGRAM.COM/" + ig : "", 62, 391, { size: 15, maxW: 215 })

        // judul besar
        text(big, 50, 455, { size: 98, maxW: 330 })
        text(small, 56, 546, { size: 41, maxW: 330 })

        // paragraf kecil
        ctx.font = `bold 11px ${FONT}`
        wrapLines(ctx, pesan.toUpperCase(), 245, 4).forEach((ln, i) => text(ln, 42, 584 + i * 14.5, { size: 11, sh: true }))

        // × × ×
        for (let i = 0; i < 3; i++) text("×", 81, 665 + i * 19, { size: 19, align: "center" })

        // kata vertikal tengah + kutipan serif dua kolom
        text(kata, 501, 482, { size: 62, maxW: 280, align: "center", rot: UP })
        ctx.font = `normal 13.5px EstetikLora`
        wrapLines(ctx, kutipan, 285, 2).forEach((ln, i) => text(ln, 548 + i * 23, 620, { font: "EstetikLora", size: 13.5, weight: "normal", align: "left", rot: UP, maxW: 285 }))

        // kata raksasa di tepi kanan (sengaja terpotong tepi)
        text(kata, 713, 552, { size: 104, maxW: 570, align: "center", rot: UP })
    }

    if (front) {
        // bawah: sosmed, tulisan serif, tiga kotak merah, kredit editor (di depan orang)
        text("FACEBOOK | INSTAGRAM | TWITTER | PINTEREST", W / 2, 912, { font: "EstetikMed", size: 14, weight: "normal", align: "center", maxW: 420 })
        text(`- ${bawah} -`, W / 2, 947, { font: "EstetikLora", size: 33, weight: "normal", align: "center", maxW: 420 })
        shadow(false)
        for (let i = 0; i < 3; i++) {
            const x = 349 + i * 12.5
            ctx.fillStyle = "#c4151c"; ctx.fillRect(x, 981, 10.5, 10.5)
            ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 0.8; ctx.strokeRect(x, 981, 10.5, 10.5)
        }
        if (d.nama) text(`Edit by ~ ${d.nama}`, 60, 855, { size: 20, maxW: 260, alpha: 0.4, sh: false })
    }
    ctx.restore()
}

// blur halus: perkecil bertahap lalu besarkan lagi (tidak tergantung dukungan ctx.filter)
function blurCanvas(src, W, H, strength = 14) {
    const steps = []
    let w = W, h = H
    for (let i = 0; i < 3; i++) { w = Math.max(8, Math.round(w / 2)); h = Math.max(8, Math.round(h / 2)); steps.push([w, h]) }
    const minW = Math.max(8, Math.round(W / strength)), minH = Math.max(8, Math.round(H / strength))
    steps.push([minW, minH])
    let cur = src
    for (const [sw, sh] of steps) {
        const c = Canvas.createCanvas(sw, sh), x = c.getContext("2d")
        x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"
        x.drawImage(cur, 0, 0, sw, sh); cur = c
    }
    // naik lagi bertahap (bukan sekali loncat) supaya hasilnya mulus
    for (let i = steps.length - 2; i >= -1; i--) {
        const [sw, sh] = i >= 0 ? steps[i] : [W, H]
        const c = Canvas.createCanvas(sw, sh), x = c.getContext("2d")
        x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"
        x.drawImage(cur, 0, 0, sw, sh); cur = c
    }
    return cur
}

// foto isi penuh (cover, crop tengah) tanpa latar putih: dipakai juga untuk potongan orang supaya posisinya pas dengan latar
function drawCover(ctx, img, W, H) {
    const sc = Math.max(W / img.width, H / img.height)
    const dw = img.width * sc, dh = img.height * sc
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
}

// potongan orang (background dihapus) lewat iLoveIMG: scraper di plugins/tools/_iloveimg.js (sama dengan fitur .removebg2)
async function getCutout(buf) {
    const Kit = require("./ApiKit.js")
    const { removeBgILoveImg } = require("../plugins/tools/_iloveimg.js")
    const axios = require("axios")
    const job = (async () => {
        const link = await Kit.uploadMedia(buf)
        const r = await removeBgILoveImg(link)
        const res = await axios.get(r.downloadUrl, { headers: r._auth, responseType: "arraybuffer", timeout: 60000 })
        const out = Buffer.from(res.data)
        await Canvas.loadImage(out)   // pastikan benar-benar gambar (bukan zip / pesan error)
        return out
    })()
    return Promise.race([job, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout hapus background")), 90000))])
}

/* ---------- FOTO ESTETIK: poster frame Instagram (estetik2, estetik3) ---------- */
// ambil sebagian foto (reg = [x,y,w,h] pecahan 0..1) lalu isi ke kotak (cover)
function igCrop(ctx, img, reg, x, y, w, h, r = 0) {
    let sx = reg[0] * img.width, sy = reg[1] * img.height, sw = reg[2] * img.width, sh = reg[3] * img.height
    const ar = w / h
    if (sw / sh > ar) { const nw = sh * ar; sx += (sw - nw) / 2; sw = nw } else { const nh = sw / ar; sy += (sh - nh) / 2; sh = nh }
    ctx.save()
    if (r) roundPath(ctx, x, y, w, h, r); else { ctx.beginPath(); ctx.rect(x, y, w, h) }
    ctx.clip(); ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h); ctx.restore()
}
// kotak dengan bayangan lembut (kartu / tile / pill)
function igBox(ctx, x, y, w, h, r, fill, { shadow = 0.22, blur = 18, border = null, bw = 3 } = {}) {
    ctx.save()
    if (shadow) { ctx.shadowColor = `rgba(0,0,0,${shadow})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = blur * 0.35 }
    roundPath(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill()
    ctx.restore()
    if (border) { ctx.save(); roundPath(ctx, x, y, w, h, r); ctx.lineWidth = bw; ctx.strokeStyle = border; ctx.stroke(); ctx.restore() }
}
function igText(ctx, str, x, y, { font = "EstetikMed", size = 20, weight = "normal", color = "#222", align = "left", maxW = 0, style = "" } = {}) {
    if (!str) return 0
    let sz = size
    const set = () => { ctx.font = `${style ? style + " " : ""}${weight} ${sz}px ${font}, ${FONT}` }
    set()
    if (maxW) for (; sz > 8 && ctx.measureText(str).width > maxW; sz--) set()
    ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillStyle = color
    ctx.fillText(str, x, y)
    return ctx.measureText(str).width
}
// ikon Instagram (garis, ukuran s, titik tengah cx,cy)
const IG_ICON = {
    heart(ctx, s, fill) { ctx.beginPath(); ctx.moveTo(0, 10); ctx.bezierCurveTo(-16, -2, -9, -14, 0, -6); ctx.bezierCurveTo(9, -14, 16, -2, 0, 10); ctx.closePath(); fill ? ctx.fill() : ctx.stroke() },
    comment(ctx) { ctx.beginPath(); ctx.arc(0, 0, 10.5, Math.PI * 0.72, Math.PI * 0.72 + Math.PI * 1.88); ctx.lineTo(-12, 12); ctx.lineTo(-7.8, 7.4); ctx.stroke() },
    send(ctx) { ctx.beginPath(); ctx.moveTo(12, -11); ctx.lineTo(-11, -2.5); ctx.lineTo(-3, 2); ctx.lineTo(2, 11); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(12, -11); ctx.lineTo(-3, 2); ctx.stroke() },
    bookmark(ctx, s, fill) { ctx.beginPath(); ctx.moveTo(-8, -11); ctx.lineTo(8, -11); ctx.lineTo(8, 11); ctx.lineTo(0, 4.5); ctx.lineTo(-8, 11); ctx.closePath(); fill ? ctx.fill() : ctx.stroke() },
    home(ctx, s, fill) { ctx.beginPath(); ctx.moveTo(-11, 1); ctx.lineTo(0, -10); ctx.lineTo(11, 1); ctx.lineTo(8.5, 1); ctx.lineTo(8.5, 11); ctx.lineTo(-8.5, 11); ctx.lineTo(-8.5, 1); ctx.closePath(); fill ? ctx.fill() : ctx.stroke() },
    search(ctx) { ctx.beginPath(); ctx.arc(-2, -2, 8.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(4.5, 4.5); ctx.lineTo(11, 11); ctx.stroke() },
    plus(ctx) { roundPath(ctx, -10.5, -10.5, 21, 21, 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke() },
    person(ctx) { ctx.beginPath(); ctx.arc(0, -4.5, 5.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 14, 11, Math.PI * 1.17, Math.PI * 1.83); ctx.stroke() },
    camera(ctx) { roundPath(ctx, -11, -8, 22, 17, 5); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0.5, 4.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(6.5, -3.5, 0.9, 0, Math.PI * 2); ctx.fill() },
    dots(ctx) { for (const y of [-7, 0, 7]) { ctx.beginPath(); ctx.arc(0, y, 1.9, 0, Math.PI * 2); ctx.fill() } },
    dotsH(ctx) { for (const x of [-7, 0, 7]) { ctx.beginPath(); ctx.arc(x, 0, 2, 0, Math.PI * 2); ctx.fill() } }
}
function igIcon(ctx, name, cx, cy, size, color, { fill = false, lw = 2 } = {}) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(size / 26, size / 26)
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.lineCap = "round"
    IG_ICON[name](ctx, size, fill); ctx.restore()
}
// latar = foto di-blur penuh + lapisan warna
function igBackground(ctx, img, W, H, wash) {
    const raw = Canvas.createCanvas(W, H)
    drawCover(raw.getContext("2d"), img, W, H)
    ctx.drawImage(blurCanvas(raw, W, H, 16), 0, 0)
    ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H)
}
const igUser = (s) => String(s || "").replace(/^@/, "").replace(/\s+/g, "")

// estetik2: frame Instagram hijau (gaya Tighnari) | koordinat dirancang di 736x1042
function renderIgGreen(ctx, d, t, img, W, H) {
    const S = W / 736
    igBackground(ctx, img, W, H, "rgba(212,226,186,0.80)")
    ctx.save(); ctx.scale(S, S)
    // kata raksasa di belakang (tiap kata satu baris)
    const rows = String(d.kata || "GEN SHIN IMP ACT").toUpperCase().split(/\s+/).filter(Boolean).slice(0, 4)
    const ys = rows.length === 1 ? [520] : rows.map((_, i) => 150 + i * (770 / (rows.length - 1)))
    rows.forEach((w, i) => igText(ctx, w, 368, ys[i], { font: FONT, weight: "bold", size: 230, maxW: 640, align: "center", color: "rgba(66,84,58,0.24)" }))
    // kartu putih
    igBox(ctx, 145, 200, 460, 672, 10, "#ffffff", { shadow: 0.28, blur: 34 })
    igIcon(ctx, "camera", 198, 251, 30, "#222", { lw: 1.8 })
    igText(ctx, "Instagram", 224, 252, { font: "EstetikLora", style: "italic", weight: "bold", size: 27, color: "#222" })
    igIcon(ctx, "comment", 490, 252, 28, "#222", { lw: 1.8 })
    ctx.fillStyle = "#e0245e"; ctx.beginPath(); ctx.arc(503, 238, 4.5, 0, Math.PI * 2); ctx.fill()
    igIcon(ctx, "send", 544, 250, 28, "#222", { lw: 1.8 })
    // avatar + username
    const g = ctx.createLinearGradient(180, 288, 224, 330); g.addColorStop(0, "#f9a23c"); g.addColorStop(1, "#c13584")
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(202, 308, 22, 0, Math.PI * 2); ctx.fill()
    ctx.save(); ctx.beginPath(); ctx.arc(202, 308, 19, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.clip()
    igCrop(ctx, img, [0.2, 0.05, 0.6, 0.5], 183, 289, 38, 38); ctx.restore()
    igText(ctx, igUser(d.ig), 232, 308, { size: 16, weight: "bold", color: "#2b2b2b", maxW: 270 })
    igIcon(ctx, "dots", 544, 306, 26, "#222")
    // foto utama
    igCrop(ctx, img, [0, 0, 1, 1], 172, 338, 398, 400)
    igIcon(ctx, "heart", 199, 766, 30, "#222", { lw: 1.9 }); igIcon(ctx, "comment", 244, 766, 30, "#222", { lw: 1.9 }); igIcon(ctx, "send", 288, 765, 30, "#222", { lw: 1.9 })
    igIcon(ctx, "bookmark", 541, 765, 30, "#222", { lw: 1.9 })
    igIcon(ctx, "home", 207, 836, 30, "#222", { fill: true }); igIcon(ctx, "search", 287, 836, 30, "#222", { lw: 2.4 })
    igIcon(ctx, "plus", 367, 836, 30, "#222", { lw: 2.2 }); igIcon(ctx, "heart", 447, 836, 30, "#222", { lw: 2.2 }); igIcon(ctx, "person", 527, 836, 30, "#222", { lw: 2.2 })
    // pill & tile
    igBox(ctx, 194, 108, 142, 55, 14, "#3c4b4e", { shadow: 0.2, blur: 10 })
    igText(ctx, d.judul, 265, 136, { font: FONT, weight: "bold", size: 27, maxW: 122, align: "center", color: "#fff" })
    igBox(ctx, 75, 175, 205, 40, 20, "#a9c086", { shadow: 0.15, blur: 8 })
    igText(ctx, d.sub, 177, 196, { font: FONT, weight: "bold", size: 22, maxW: 185, align: "center", color: "#fff" })
    igBox(ctx, 498, 782, 208, 38, 19, "#a9c086", { shadow: 0.15, blur: 8 })
    igText(ctx, d.nama ? `art by: ${d.nama}` : "", 602, 802, { font: FONT, weight: "bold", size: 19, maxW: 186, align: "center", color: "#fff" })
    const tile = (reg, x, y) => { igBox(ctx, x, y, 128, 135, 18, "#fff", { shadow: 0.3, blur: 22 }); igCrop(ctx, img, reg, x + 4, y + 4, 120, 127, 15); roundPath(ctx, x, y, 128, 135, 18); ctx.lineWidth = 3; ctx.strokeStyle = "#cfe0b4"; ctx.stroke() }
    tile([0.22, 0.1, 0.56, 0.3], 372, 115); tile([0.45, 0.5, 0.55, 0.45], 548, 425); tile([0.05, 0.45, 0.5, 0.5], 92, 562)
    if (d.brand) {
        igText(ctx, d.brand, 62, 805, { font: "EstetikLora", style: "italic", weight: "bold", size: 40, maxW: 170, color: "#1f1f1f" })
    }
    ctx.restore()
}

// estetik3: frame Instagram kuning (gaya Flora) | koordinat dirancang di 675x1200
function renderIgYellow(ctx, d, t, img, W, H) {
    const S = W / 675
    igBackground(ctx, img, W, H, "rgba(255,255,255,0.62)")
    ctx.save(); ctx.scale(S, S)
    const Y = (() => { const g = ctx.createLinearGradient(0, 80, 0, 260); g.addColorStop(0, "#ffd21f"); g.addColorStop(1, "#ffb800"); return g })()
    const big = String(d.judul || "").toUpperCase()
    // nama besar atas & bawah (di belakang kartu)
    igText(ctx, big, 337, 172, { font: FONT, weight: "bold", size: 215, maxW: 545, align: "center", color: Y })
    igText(ctx, big, 337, 1000, { font: FONT, weight: "bold", size: 215, maxW: 545, align: "center", color: Y })
    // kartu
    igBox(ctx, 63, 178, 558, 795, 8, "#ffffff", { shadow: 0.28, blur: 36 })
    ctx.save(); ctx.beginPath(); ctx.arc(127, 222, 31, 0, Math.PI * 2); ctx.clip(); igCrop(ctx, img, [0.2, 0.05, 0.6, 0.5], 96, 191, 62, 62); ctx.restore()
    const un = igUser(d.ig)
    const uw = igText(ctx, un, 169, 226, { size: 25, weight: "normal", color: "#2a2a2a", maxW: 235 })
    const bx = 169 + Math.min(uw, 235) + 18
    ctx.fillStyle = "#3b8cf0"; ctx.beginPath(); ctx.arc(bx, 226, 11, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(bx - 5, 226.5); ctx.lineTo(bx - 1.5, 230); ctx.lineTo(bx + 5.5, 222); ctx.stroke()
    igBox(ctx, 428, 207, 120, 42, 10, "#e3e3e6", { shadow: 0 }); igText(ctx, "Follow", 488, 228, { font: FONT, weight: "bold", size: 26, color: "#fff", align: "center" })
    igIcon(ctx, "dotsH", 580, 226, 26, "#333")
    igCrop(ctx, img, [0, 0, 1, 1], 93, 272, 497, 498)
    igIcon(ctx, "heart", 124, 813, 42, "#1b1b1b", { fill: true }); igIcon(ctx, "comment", 189, 813, 38, "#1b1b1b", { lw: 2.4 })
    igIcon(ctx, "send", 253, 813, 38, "#1b1b1b", { lw: 2.4 }); igIcon(ctx, "bookmark", 564, 813, 38, "#1b1b1b", { lw: 2.4 })
    // caption (campur tebal & biasa)
    const seg = (parts, x, y, size, maxW) => { let cx = x; for (const [txt, bold, col] of parts) { cx += igText(ctx, txt, cx, y, { size, weight: bold ? "bold" : "normal", color: col || "#1b1b1b" }) } }
    const follow = igUser(d.follow || d.ig)
    seg([["Disukai oleh ", false], [follow, true], [" dan", false]], 80, 850, 21)
    const cap = d.caption || "make it simple, make it yours"
    const first = "gibran_rakabuming"
    ctx.font = `bold 21px EstetikMed`
    const lines = wrapLines(ctx, `${first} ${cap}`, 420, 2)
    const l0 = lines[0] || ""
    seg([[first, true], [l0.startsWith(first) ? l0.slice(first.length) : " " + l0, false]], 80, 877, 21)
    if (lines[1]) seg([[lines[1], false]], 80, 903, 21)
    const baseY = lines[1] ? 903 : 877
    const tgl = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", timeZone: "Asia/Jakarta" })
    igText(ctx, "Lihat semua 1999 komentar", 80, baseY + 30, { size: 18, color: "#8a8a8a" })
    const tw = igText(ctx, tgl + "  ·  ", 80, baseY + 55, { size: 18, color: "#8a8a8a" })
    igText(ctx, "Lihat terjemahan", 80 + tw, baseY + 55, { size: 18, weight: "bold", color: "#8a8a8a" })
    // bar bawah
    igBox(ctx, 35, 1002, 410, 44, 10, "#ffffff", { shadow: 0.16, blur: 12 })
    igIcon(ctx, "home", 72, 1024, 28, "#555", { lw: 1.8 }); igIcon(ctx, "search", 148, 1024, 28, "#555", { lw: 1.8 })
    igIcon(ctx, "plus", 224, 1024, 28, "#555", { lw: 1.8 }); igIcon(ctx, "heart", 300, 1024, 28, "#555", { lw: 1.8 })
    ctx.save(); ctx.beginPath(); ctx.arc(376, 1024, 14, 0, Math.PI * 2); ctx.clip(); igCrop(ctx, img, [0.2, 0.05, 0.6, 0.5], 362, 1010, 28, 28); ctx.restore()
    // kata vertikal kuning di depan kartu (huruf pertama garis saja)
    const rows = String(d.kata || "LOE ITU PEN DEK").toUpperCase().split(/\s+/).filter(Boolean).slice(0, 4)
    rows.forEach((w, i) => {
        const cy = 338 + i * 118
        ctx.font = `bold 128px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"
        const fw = ctx.measureText(w[0]).width
        ctx.lineWidth = 3; ctx.strokeStyle = "#ffc81e"; ctx.lineJoin = "round"; ctx.strokeText(w[0], 432, cy)
        ctx.fillStyle = Y; ctx.fillText(w.slice(1), 432 + fw, cy)
    })
    // pill biru, tile kuning, badge
    const pill = (txt, x, y, w, h) => { igBox(ctx, x, y, w, h, 8, "#3a55b8", { shadow: 0.2, blur: 8 }); igText(ctx, txt, x + w / 2, y + h / 2 + 1, { font: FONT, weight: "bold", size: 23, color: "#fff", align: "center", maxW: w - 16 }) }
    pill("Follow us", 7, 311, 138, 36); pill(follow, 36, 357, Math.max(150, Math.min(260, 40 + follow.length * 12)), 38)
    const tile = (reg, x, y, w, h) => { igBox(ctx, x, y, w, h, 2, "#fff", { shadow: 0.2, blur: 8 }); igCrop(ctx, img, reg, x + 3, y + 3, w - 6, h - 6); ctx.lineWidth = 3; ctx.strokeStyle = "#f4b400"; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3) }
    tile([0.38, 0.15, 0.3, 0.2], 52, 449, 91, 91); tile([0.4, 0.3, 0.25, 0.2], 24, 557, 93, 91); tile([0.0, 0.1, 0.4, 0.45], 7, 659, 92, 93)
    const bw = String(d.badge || "MAKE IT SIMPLE").toUpperCase().split(/\s+/).filter(Boolean), cut = Math.ceil(bw.length / 2)
    igBox(ctx, 533, 884, 104, 75, 8, "#ffffff", { shadow: 0.25, blur: 14 })
    igText(ctx, bw.slice(0, cut).join(" "), 585, 904, { font: FONT, weight: "bold", size: 20, color: "#2b3f9e", align: "center", maxW: 92 })
    igText(ctx, bw.slice(cut).join(" "), 585, 926, { font: FONT, weight: "bold", size: 20, color: "#2b3f9e", align: "center", maxW: 92 })
    ctx.fillStyle = "#3a55b8"; let bxp = 542; for (let i = 0; bxp < 628; i++) { const w = 1 + ((i * 7) % 3); ctx.fillRect(bxp, 938, w, 12); bxp += w + 1.6 }
    // tulisan bawah
    const bawah = String(d.bawah || `AYO IKUT KE DUNIAKU. HALO AKU ${big}`).toUpperCase()
    ctx.font = `bold 15px ${FONT}`
    wrapLines(ctx, bawah, 470, 2).forEach((ln, i) => igText(ctx, ln, 337, 1111 + i * 19, { font: FONT, weight: "bold", size: 15, color: "#4a4a4a", align: "center" }))
    ctx.restore()
}

const PINK = { outer: "#ee8fbd", inner: "#f6a6cb", stops: [[0, "#ffffff"], [1, "#ffcfe5"]] }
const PINK2 = { outer: "#c46aa8", inner: "#d98cc2", stops: [[0, "#ffffff"], [0.5, "#ffffff"], [0.52, "#ffb3dc"], [1, "#ffa6d4"]] }
const SAND = { outer: "#8d7a5b", inner: "#b5a07a", stops: [[0, "#fffaf0"], [0.5, "#e9dcc2"], [1, "#b5a07a"]] }

// extra.cutout = Buffer PNG orang tanpa latar (opsional, khusus template dengan tpl.cutout)
async function compose(tpl, data, photos, extra = {}) {
    ensureFont()
    const base = tpl.file ? await loadTemplate(tpl.file) : null   // tanpa file = poster digambar lewat code (ukuran dari tpl.size)
    const W = base ? base.width : tpl.size[0], H = base ? base.height : tpl.size[1]
    const canvas = Canvas.createCanvas(W, H)
    const ctx = canvas.getContext("2d")

    if (tpl.render && tpl.multi) {   // template tmpl* baru: semua foto (1-3) + potongan orang (opsional) dikirim ke render
        const imgs = []
        for (const b of photos) imgs.push(await Canvas.loadImage(b))
        const cutImg = extra.cutout ? await Canvas.loadImage(extra.cutout) : null
        tpl.render(ctx, data, tpl, imgs, W, H, cutImg)
        return canvas.encode("jpeg", 92)
    }
    if (tpl.render) {   // poster digambar penuh lewat code dari 1 foto (tmplhijau, tmplkuning)
        tpl.render(ctx, data, tpl, await Canvas.loadImage(photos[0]), W, H)
        return canvas.encode("jpeg", 92)
    }

    if (tpl.cutout && extra.cutout) {
        // 1) latar = foto yang di-blur  2) teks di belakang orang  3) potongan orang (tajam)  4) teks di depan orang
        const photo = await Canvas.loadImage(photos[0]), person = await Canvas.loadImage(extra.cutout)
        const raw = Canvas.createCanvas(W, H)
        drawCover(raw.getContext("2d"), photo, W, H)
        ctx.drawImage(blurCanvas(raw, W, H, tpl.blur || 14), 0, 0)
        ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(0, 0, W, H)
        tpl.draw(ctx, data, tpl, "behind")
        if (tpl.tekBawahDiDepan === false) tpl.draw(ctx, data, tpl, "front")   // semua teks di belakang orang (orang tidak tertimpa teks sama sekali)
        drawCover(ctx, person, W, H)
        const g = ctx.createLinearGradient(0, H * 0.78, 0, H)   // bayangan tipis di dasar supaya tulisan bawah terbaca
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.28)")
        ctx.fillStyle = g; ctx.fillRect(0, H * 0.78, W, H * 0.22)
        if (tpl.tekBawahDiDepan !== false) tpl.draw(ctx, data, tpl, "front")
        return canvas.encode("jpeg", 92)
    }

    // overlay: foto digambar DULU di bawah, template (kotak foto transparan) di atasnya -> ornamen yang menimpa kotak tetap di depan
    if (!base) { ctx.fillStyle = "#222222"; ctx.fillRect(0, 0, W, H) }
    else if (tpl.overlay) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H) } else ctx.drawImage(base, 0, 0)
    for (let i = 0; i < tpl.photos.length; i++) {
        const img = await Canvas.loadImage(photos[i])
        if (tpl.photos[i].quad) drawPhotoQuad(ctx, img, tpl.photos[i].quad)
        else drawPhoto(ctx, img, tpl.photos[i].slot, tpl.radius, tpl.overlay ? 5 : 2, tpl.photos[i])
    }
    if (base && tpl.overlay) ctx.drawImage(base, 0, 0)
    tpl.draw(ctx, data, tpl)
    return canvas.encode("jpeg", 92)
}

/* ---------- command ---------- */
// template baru (kategori Foto Estetik, command tmpl*) ada di source/FotoEstetik.js
Object.assign(TEMPLATES, require("./FotoEstetik.js")({ Canvas, FONT, roundPath, igBox, igText, igIcon, drawCover, blurCanvas, wrapLines }))
// nama lama tetap jalan (alias), tapi menu memakai nama baru
const ALIAS = { estetik1: "tmplposter", estetik2: "tmplhijau", estetik3: "tmplkuning" }

const keys = Object.keys(TEMPLATES).sort((a, b) => b.length - a.length)
const CMD_RE = new RegExp(`^(${keys.join("|")})(.*)$`, "is")
const GROUPS = { testimoni: "Testimoni", templqrs: "Template QR", tempel: "Tempel Foto", tmpl: "Foto Estetik" }

// n = nama template (mis. "testimoni2"); group = "testimoni" / "templqrs" / "tmpl" (daftar semua template di grup itu)
const usage = (prefix, n, group = "testimoni") => {
    const t = TEMPLATES[n]
    if (!t) {
        const ks = Object.keys(TEMPLATES).filter((k) => k.startsWith(group))
        if (group === "tmpl") return `*Foto Estetik*\n\n` + ks.map((k) => `*${prefix}${k}* — ${TEMPLATES[k].title} (${TEMPLATES[k].photos.length} foto)\n${prefix}${k}${TEMPLATES[k].example}`).join("\n\n") + `\n\nHabis kirim command, bot minta foto satu per satu. Ketik *batal* untuk berhenti.`
        return `*Template — ${GROUPS[group]}*\n\n` + ks.map((k) => `*${k.replace(group, "")}. ${TEMPLATES[k].title}*\n${prefix}${k}${TEMPLATES[k].example}`).join("\n\n") + `\n\nHabis itu bot minta foto satu per satu. Ketik *batal* untuk berhenti.`
    }
    return `*Template — ${n}*\n\n*Cara pakai:*\n${prefix}${n}${t.example}${t.optionalHint ? `\n\n*Opsional* (tambah berurutan setelahnya, kosongkan dengan koma kosong):\n${t.optionalHint}` : ""}\n\nHabis itu bot minta foto satu per satu:\n` + t.photos.map((p, i) => `${i + 1}. ${p.label}`).join("\n") + `\n\nKetik *batal* untuk berhenti.`
}

const askText = (tpl, i) => `📸 Kirim foto *${tpl.photos[i].label}* (${i + 1}/${tpl.photos.length})\n\nKetik *batal* untuk berhenti.`

async function handle({ sock, m, isOwner }) {
    if (!Canvas) return false
    const prefix = m.prefix || "."
    let raw = String(m.body || "").slice(prefix.length).trim().replace(/^(testimoni|templqrs|tempel|estetik)\s+(\d)/i, "$1$2")   // ".testimoni 2 nama" juga bisa
    raw = raw.replace(/^(estetik[123])(?!\d)/i, (x) => ALIAS[x.toLowerCase()])   // .estetik1/2/3 (nama lama) -> nama baru
    const bare = raw.match(/^(testimoni|templqrs|tempel|tmpl|estetik)\s*$/i)
    if (bare) { await m.reply(usage(prefix, null, bare[1].toLowerCase() === "estetik" ? "tmpl" : bare[1].toLowerCase())); return true }
    const hit = raw.match(CMD_RE)
    if (!hit) return false
    const tpl = TEMPLATES[hit[1].toLowerCase()]
    if (hit[1].toLowerCase().startsWith("tempel") && hit[2].trim()) return false   // .tempel1abc bukan command
    const parts = hit[2].split(",").map((s) => s.trim())
    const data = {}
    const allFields = [...tpl.fields, ...(tpl.optional || [])]   // wajib dulu, lalu opsional (boleh dikosongkan)
    allFields.forEach((f, i) => { data[f] = i === allFields.length - 1 ? parts.slice(i).join(",").trim() : (parts[i] || "") })
    if (tpl.fields.some((f) => !data[f])) { await m.reply(usage(prefix, hit[1].toLowerCase())); return true }
    if (data.nomor) data.nomor = data.nomor.replace(/[^\d+]/g, "")
    if (data.ig && !data.ig.startsWith("@")) data.ig = "@" + data.ig
    if (data.nominal && RUPIAH_PREFIX && /^\d/.test(data.nominal)) data.nominal = `Rp ${data.nominal}`
    sweep()
    sessions.set(keyOf(m), { tpl, data, photos: [], ts: Date.now() })
    if (!tpl.fields.length) { await m.reply(`🖼️ *${tpl.title}*\n\n${askText(tpl, 0)}`); return true }
    const ringkas = allFields.filter((f) => data[f]).map((f) => `• ${f[0].toUpperCase() + f.slice(1)}: ${data[f]}`).join("\n")
    await m.reply(`✅ Data diterima\n\n${ringkas}\n\n${askText(tpl, 0)}`)
    return true
}

// pesan biasa (bukan command) selama ada sesi: foto masuk berurutan, "batal" menghentikan
async function handleMedia({ sock, m }) {
    if (!Canvas || m.fromMe) return false
    const k = keyOf(m)
    const s = sessions.get(k)
    if (!s) return false
    if (Date.now() - s.ts > SESSION_TTL) { sessions.delete(k); return false }

    const body = String(m.body || "").trim().replace(/^[.!#/]/, "").toLowerCase()
    if (body === "batal" || body === "cancel") { sessions.delete(k); await m.reply("❎ Dibatalkan."); return true }

    const mime = m.msg?.mimetype || ""
    if (!/^image\//.test(mime) || typeof m.download !== "function") return false

    let buf
    try { buf = await m.download() } catch (e) { await m.reply("❌ Gagal mengambil foto, kirim ulang."); return true }
    s.photos.push(buf)
    s.ts = Date.now()
    if (s.photos.length < s.tpl.photos.length) { await m.reply(`✅ ${s.tpl.photos[s.photos.length - 1].label} diterima.\n\n${askText(s.tpl, s.photos.length)}`); return true }

    sessions.delete(k)
    try {
        await sock.sendMessage(m.chat, { text: s.tpl.cutout ? "⏳ Lagi dibuat (hapus background fotonya dulu, tunggu sebentar)..." : "⏳ Lagi dibuat..." }, { quoted: m }).catch(() => {})
        const extra = {}
        let note = ""
        if (s.tpl.cutout) {
            try { extra.cutout = await getCutout(s.photos[s.tpl.cutoutIndex || 0]) } catch (e) {
                console.log("[SetorTemplate] hapus background gagal:", e?.message || e)
                note = s.tpl.multi ? "\n\n⚠️ Background fotonya gagal dihapus, jadi foto dipakai utuh (tanpa efek orang keluar). Coba lagi sebentar lagi." : "\n\n⚠️ Background fotonya gagal dihapus, jadi hasilnya tanpa efek blur. Coba lagi sebentar lagi."
            }
        }
        const out = await compose(s.tpl, s.data, s.photos, extra)
        await sock.sendMessage(m.chat, { image: out, caption: (s.tpl.caption || `✅ Testimoni *${s.data.nama}* jadi.`) + note }, { quoted: m })
    } catch (e) {
        console.log("[SetorTemplate] error:", e?.message || e)
        await m.reply(`❌ Gagal membuat gambar: ${e?.message || e}`).catch(() => {})
    }
    return true
}

module.exports = { handle, handleMedia, TEMPLATES, _compose: compose }
