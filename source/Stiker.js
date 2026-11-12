/*
  Stiker — kategori "Stiker" (semua fitur pembuat stiker).
  Satu fitur = satu file di folder /plugins/stiker (nama file diawali "_" = diabaikan, mis. _lib.js).
  Format plugin & cara kerja loader: lihat source/PluginLoader.js.

  Tambah fitur baru: taruh file di /plugins/stiker, lalu tambahkan command-nya di source/MenuData.js.
  Kalau fiturnya mau kena limit harian, tambahkan nama commandnya di LIMITED (source/Limit.js).
*/
const path = require("path")
const { createLoader } = require("./PluginLoader.js")

module.exports = createLoader({ label: "Stiker", dir: path.join(__dirname, "..", "plugins", "stiker"), failText: "Gagal membuat stiker" })
