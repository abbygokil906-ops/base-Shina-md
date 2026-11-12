/*
  Stalker — kategori "Stalker" (cek info akun: NPM, Free Fire, GitHub, Instagram, Mobile Legends, Roblox,
  Telegram, Threads, TikTok, X, YouTube).
  Satu fitur = satu file di folder /plugins/stalker (nama file diawali "_" = diabaikan, mis. _lib.js).
  Format plugin & cara kerja loader: lihat source/PluginLoader.js, helper fitur API: plugins/stalker/_lib.js.

  Tambah fitur baru: taruh file di /plugins/stalker, lalu tambahkan command-nya di source/MenuData.js (kategori Stalker).
  Kalau fiturnya mau kena limit harian, tambahkan nama commandnya di LIMITED (source/Limit.js).
*/
const path = require("path")
const { createLoader } = require("./PluginLoader.js")

module.exports = createLoader({ label: "Stalker", dir: path.join(__dirname, "..", "plugins", "stalker"), failText: "Gagal mengambil data akun" })
