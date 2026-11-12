/*
  AI Image — kategori "AI Image" (bikin gambar dari teks, edit foto, HD/unblur, to-figure/chibi/ghibli/lego, dll).
  Satu fitur = satu file di folder /plugins/aiimage (nama file diawali "_" = diabaikan, mis. _lib.js).
  Format plugin & cara kerja loader: lihat source/PluginLoader.js, helper fitur API: plugins/aiimage/_lib.js.

  Tambah fitur baru: taruh file di /plugins/aiimage, lalu tambahkan command-nya di source/MenuData.js (kategori AI Image).
  Kalau fiturnya mau kena limit harian, tambahkan nama commandnya di LIMITED (source/Limit.js).
*/
const path = require("path")
const { createLoader } = require("./PluginLoader.js")

module.exports = createLoader({ label: "AI Image", dir: path.join(__dirname, "..", "plugins", "aiimage"), failText: "Gagal memproses gambar" })
