/*
  AI — kategori "AI" (chat dengan berbagai AI: ChatGPT, Gemini, Claude Haiku, Qwen, Guru, karakter, dll).
  Satu fitur = satu file di folder /plugins/ai (nama file diawali "_" = diabaikan, mis. _lib.js).
  Format plugin & cara kerja loader: lihat source/PluginLoader.js, helper fitur API: plugins/ai/_lib.js.

  Tambah fitur baru: taruh file di /plugins/ai, lalu tambahkan command-nya di source/MenuData.js (kategori AI).
  Kalau fiturnya mau kena limit harian, tambahkan nama commandnya di LIMITED (source/Limit.js).
*/
const path = require("path")
const { createLoader } = require("./PluginLoader.js")

module.exports = createLoader({ label: "AI", dir: path.join(__dirname, "..", "plugins", "ai"), failText: "AI gagal menjawab" })
