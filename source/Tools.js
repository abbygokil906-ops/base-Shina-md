/*
  Tools — fitur API kategori "Tools" (bypass, cek nomor, removebg, ocr, tts, AI video, dll).
  Satu fitur = satu file di folder /plugins/tools (nama file diawali "_" = diabaikan, mis. _lib.js).
  Fitur lama (.limit, .tourl, .tourl2, .cekidch) tetap berupa case di fuyuha.js.
  Format plugin & cara kerja loader: lihat source/PluginLoader.js, helper fitur API: tools/_lib.js.

  Tambah fitur baru: taruh file di /plugins/tools, lalu tambahkan command-nya di source/MenuData.js (kategori Tools).
  Kalau fiturnya mau kena limit harian, tambahkan nama commandnya di LIMITED (source/Limit.js).
*/
const path = require("path")
const { createLoader } = require("./PluginLoader.js")

module.exports = createLoader({ label: "Tools", dir: path.join(__dirname, "..", "plugins", "tools"), failText: "Fitur gagal dijalankan" })
