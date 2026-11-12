/*
  Canva — kategori "Canva" (gambar jadi lewat API /canvas: fake lobby FF/ML, fake chat, quotes, music card, pixel art, dll).
  Satu fitur = satu file di folder /plugins/canva (nama file diawali "_" = diabaikan, mis. _lib.js).
  Format plugin & cara kerja loader: lihat source/PluginLoader.js, helper fitur API: plugins/canva/_lib.js.

  Tambah fitur baru: taruh file di /plugins/canva, lalu tambahkan command-nya di source/MenuData.js (kategori Canva).
  Kalau fiturnya mau kena limit harian, tambahkan nama commandnya di LIMITED (source/Limit.js).
*/
const path = require("path")
const { createLoader } = require("./PluginLoader.js")

module.exports = createLoader({ label: "Canva", dir: path.join(__dirname, "..", "plugins", "canva"), failText: "Gagal membuat gambar" })
