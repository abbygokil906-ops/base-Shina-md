/* 


*/

const chalk = require("chalk");
const fs = require("fs");

// ===== OWNER KONTROL BOT =====
// Ganti nomor di bawah (format 628xxx, tanpa + / spasi / 0 di depan) = nomor itu jadi owner & bisa pakai SEMUA fitur owner.
// Nomor pembuat script (tombol Order Panel Murah, Sumber Script, Script/VVIP, Chat Penjual, kontak .owner, kredit "Powered By")
// terkunci di source/Brand.js dan TIDAK ikut berubah.
global.owner = "62882008508733" // GANTI ke nomor WA owner lu (628xxx, tanpa + / spasi / 0 depan)
// Owner tambahan (nomor biasa), mis. ["628xxxx"]
global.ownerExtra = []
// Nomor dirapikan otomatis: "+62 812-xxx" / "0812xxx" / "62812xxx" semuanya jadi 62812xxx (jadi salah format tidak bikin owner ditolak)
const _rapikan = (n) => String(n || "").replace(/\D/g, "").replace(/^0+/, "62")
global.owner = _rapikan(global.owner)
global.ownerExtra = global.ownerExtra.map(_rapikan).filter(Boolean)
// ID LID owner: SEKARANG OTOMATIS dicari bot dari nomor owner di atas, jadi biasanya tidak perlu diisi.
// Isi hanya kalau owner masih ditolak ("hanya untuk ownerbot"): lihat log "[OwnerCheck] pengirim LID tidak dikenali: 1234@lid", masukkan angkanya, mis. ["1234567890123"]
global.ownerLid = []
global.namaOwner = "Megumi Kaito"
global.linkOwner = "https://wa.me/62882008508733?text=p" // GANTI sesuai nomor owner
global.namaBot = "Fuyuha Shina Multi Device"
global.mode_public = true

global.linkChannel = "https://whatsapp.com/channel/-"
global.idChannel = "-@newsletter"
global.namaCh = "Fuyuha Shina MD"
global.linkGrup = "https://chat.whatsapp.com/-?mode=ac_t"
// Foto lokal (folder media), dibaca sebagai buffer
try {
    global.thumbnail = fs.readFileSync(require("path").join(__dirname, "media", "thumbnail.jpg"))
} catch (e) {
    global.thumbnail = null
}

// Video menu utama (.menu): video asli jadi header menu, foto (media/thumbnail.jpg) tampil sebagai kartu besar terpisah di gelembung yang sama.
// Ganti video = timpa file media/menu-video.mp4. Hapus file-nya = .menu kembali pakai foto biasa.
try {
    // foto kartu di menu: sudah dipas ke rasio kartu WhatsApp (1.91:1, latar blur) supaya tidak kepotong. Tidak ada -> pakai foto menu
    global.menuKartuFoto = require("fs").readFileSync(require("path").join(__dirname, "media", "kartu-foto.jpg"))
} catch (e) {
    global.menuKartuFoto = null
}
global.menuFotoKartu = false       // true = foto jadi kartu besar di bawah video | false = video saja (tanpa kartu foto)
global.menuVideoAutoplay = true   // true = video jalan otomatis (mode GIF: berulang & tanpa suara) | false = video biasa (ada suara, tekan play)
try {
    global.menuVideo = require("fs").readFileSync(require("path").join(__dirname, "media", "menu-video.mp4"))
} catch (e) {
    global.menuVideo = null
}

// Audio menu (folder media, sama seperti foto di atas): dikirim SETELAH menu keluar, sebagai VOICE NOTE (VN) biasa, tanpa foto.
// Taruh file audionya di media/menu.mp3 (mp3/m4a/ogg/wav; atau ganti path di bawah, boleh juga link https://...). File belum ada = audio dilewati.
global.audioMenuAktif = true   // false = matikan audio menu
global.audioMenuFile = require("path").join(__dirname, "media", "menu.mp3")
global.audioMenuVN = true      // true = tampil sebagai voice note (VN) | false = audio biasa
global.audioMenuDurasi = 60    // detik: audio dipotong dari awal sampai segini (ada fade out 3 detik). 0 = kirim utuh (lagunya 13 menit, tidak disarankan)

// Foto di kotak kutipan (reply) SEMUA pesan bot: menu, audio/VN, teks, dll. Fotonya sama dengan foto menu (media/thumbnail.jpg). false = matikan.
global.fotoReply = false
global.fotoReplyFile = require("path").join(__dirname, "media", "foto-reply.jpg")   // foto di kotak reply (kalau file tidak ada, pakai foto menu)
global.fotoReplyMode = "product"   // "product" | "order" | "image" | "location" | "document" — kalau layout belum pas di HP, ketik .tesfoto lalu pilih yang enak
global.fotoReplyCentang = true   // true = ada centang biru (pengirim kutipan jadi akun resmi WhatsApp) | false = nama asli user
global.fotoReplyTeks = "Fuyuha Shina MD"   // teks di sebelah kanan foto (mode order/product)

// Bahasa awal menu untuk semua user: "en" (English) atau "id" (Indonesia). User bisa ganti sendiri lewat tombol Bahasa di .menu
global.bahasaDefault = "en"

global.dana = "-"
global.ovo = "Tidak tersedia"
global.gopay = "Tidak tersedia"
global.qris = "https://files.catbox.moe/18ptcf.jpg"

global.JedaPushkontak = 5000
global.JedaJpm = 5000

global.egg = "15" // Isi id egg
global.nestid = "5" // Isi id nest
global.loc = "1" // Isi id location
global.domain = "https://server.ricotasya.my.id"
global.apikey = "ptla_xZZxSITraBdGqPT0Ge4nRb3HxLOZW9yX0oDM82J3" // Isi api ptla
global.capikey = "ptlc_TroIQEI72IEJRtMD2ZomZ1CV7Oeoi0ufEyWSWedle" // Isi api ptlc


// ===================== NOKOS (Nokoskuy API v2) =====================
// Fitur jual nomor OTP. Aktif-nonaktif lewat chat: .nokosmode on / off
global.nokos = {
    apiKey: "ISI_API_KEY_NOKOSKUY",           // API key dari menu Developer Nokoskuy (nks_...)
    baseUrl: "https://welper.web.id/nokoskuy/api/v2",
    websiteUrl: "https://www.welper.web.id",

    // ----- MARGIN KEUNTUNGAN (Rupiah) -----
    // marginOrder : untung tiap order nomor (ditambah ke harga dari API)
    // marginQr    : untung admin QR tiap deposit (dipotong dari saldo yang masuk ke pembeli)
    // Dua-duanya diatur di sini. Mau disamakan? Isi angka yang sama.
    marginOrder: 500,
    marginQr: 500,
    marginOrderPersen: 0,                      // opsional: tambahan untung dalam persen dari harga API

    // ----- TAMPILAN (bisa diganti lewat chat: .setnamatoko / .setnamaowner) -----
    namaToko: "WELPER NOKOS",
    namaOwner: global.namaOwner,

    // ----- MAINTENANCE KE SALURAN -----
    jamMaintenance: [12, 0],                   // jam WIB: 12 siang & 12 malam (00)
    menitMaintenance: 10,                      // lama maintenance sebelum pesan "selesai" dikirim
    blokirOrderSaatMaintenance: false,         // true = order ditolak selama maintenance

    layananPopuler: ["whatsapp", "telegram", "instagram", "tiktok", "shopee", "gojek", "facebook", "google"],
    jumlahServer: 7
}


// ===================== WARUNG (Nokos + Script + Panel) =====================
// Aktif-nonaktif lewat chat: .modewarung on / off   |   menu pengaturan: .settingwarung
// Bisa jalan bareng .nokosmode on (kategori Nokos ikut tampil di halaman awal warung)
global.warung = {
    namaWarung: "WELPER WARUNG",              // bisa diganti lewat chat: .setnamawarung

    // ----- GATEWAY PEMBAYARAN (Welper Payment Gateway QRIS) -----
    // API key dari halaman Developer https://welper.web.id/gateway  (bisa juga lewat chat: .setgateway key gwk_xxx)
    gateway: {
        apiKey: "ISI_API_KEY_GATEWAY",        // gwk_...
        baseUrl: "https://welper.web.id/gateway/api/v1",
        feeBearer: "customer"                 // customer = pembeli bayar fee (kamu terima penuh) | merchant = fee dipotong dari kamu
    },

    // ----- PANEL PTERODACTYL KHUSUS WARUNG (terpisah dari global.domain / global.apikey di atas) -----
    panel: {
        domain: "https://ISI_DOMAIN_PANEL_WARUNG",
        apikey: "ISI_PTLA_WARUNG",            // ptla_...
        egg: "15",
        nestid: "5",
        loc: "1",
        masaAktifHari: 30,
        emailDomain: "gmail.com",             // email akun panel = username@emailDomain
        dockerImage: "ghcr.io/parkervcp/yolks:nodejs_20",
        // catatan singkat yang ikut dikirim ke pembeli (kosongkan [] kalau tidak mau)
        catatan: ["Masa aktif 30 hari", "Simpan data ini, jangan dibagikan", "Garansi 15 hari (klaim sertakan bukti chat)"]
    },

    // ----- HARGA PANEL (Rupiah, minimal 1000). RAM/Disk/CPU diambil dari source/PanelSpec.js -----
    // Isi 0 untuk menyembunyikan paket. Harga juga bisa diubah lewat chat: .setharga 2gb 6000
    hargaPanel: {
        "1gb": 3000, "2gb": 5000, "3gb": 7000, "4gb": 9000, "5gb": 11000,
        "6gb": 13000, "7gb": 15000, "8gb": 17000, "9gb": 19000, "10gb": 21000,
        "unlimited": 25000
    },

    // ----- PRODUK SCRIPT (opsional, bisa juga ditambah lewat chat: .addscript) -----
    // { id: "sc1", nama: "Bot WA Murah", harga: 25000, kategori: "Bot WhatsApp", deskripsi: "Fitur ...", file: "storage/warung/bot.zip" }
    // atau pakai link: { ..., link: "https://..." }
    produkScript: [],

    // ----- NOTIFIKASI SALURAN (teks saja) -----
    notif: { maskNomor: true }                // false = nomor pembeli tampil lengkap
}


// ===== Pengingat adzan (.adzan on/off) =====
global.adzanKota = "Purwokerto"          // kota untuk jadwal sholat (nama kota Indonesia, mis. "Surabaya", "Makassar")
global.adzanNegara = "Indonesia"
global.adzanZona = "Asia/Jakarta"     // WIB: Asia/Jakarta | WITA: Asia/Makassar | WIT: Asia/Jayapura
global.adzanLabel = "WIB"             // label zona yang tampil di pesan
global.adzanAudioUrl = ""             // opsional: link audio adzan (https://...) kalau media/adzan.mp3 tidak ada


let file = require.resolve(__filename)
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(chalk.blue(">> Update File :"), chalk.black.bgWhite(`${__filename}`))
delete require.cache[file]
require(file)
})
