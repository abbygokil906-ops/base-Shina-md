/*
  Upload — fitur API kategori "Upload" (aisense, bashupload, fileditch): kirim / reply file, dapat link.
  Satu fitur = satu file di folder /plugins/upload (nama file diawali "_" = diabaikan, mis. _lib.js).
  Format plugin & cara kerja loader: lihat source/PluginLoader.js, helper fitur API: plugins/upload/_lib.js.

  Tambah fitur baru: taruh file di /plugins/upload, lalu tambahkan command-nya di source/MenuData.js (kategori Upload).
  Kalau fiturnya mau kena limit harian, tambahkan nama commandnya di LIMITED (source/Limit.js).
*/
const path = require("path")
const { createLoader } = require("./PluginLoader.js")

module.exports = createLoader({ label: "Upload", dir: path.join(__dirname, "..", "plugins", "upload"), failText: "Gagal upload file" })
