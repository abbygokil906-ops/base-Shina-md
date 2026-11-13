/*
  Lokasi SEMUA file database bot: folder /database (di root bot).
  Pakai:  const DBP = require("./source/DbPath.js");  DBP("namafile.json")  ->  <root>/database/namafile.json

  File lama di /storage (database.json) otomatis DIPINDAH ke /database saat bot pertama jalan
  (kalau di /database belum ada file yang sama), jadi data user tidak hilang.

  Tambah database baru: cukup pakai DBP("nama-baru.json"), foldernya otomatis dibuat.
*/
const fs = require("fs")
const path = require("path")

const DIR = path.join(process.cwd(), "database")
const LEGACY = path.join(process.cwd(), "storage")
const FILES = ["database.json"]

try { fs.mkdirSync(DIR, { recursive: true }) } catch (e) { console.log("[Database] gagal membuat folder database:", e.message) }

for (const f of FILES) {
    const oldFile = path.join(LEGACY, f)
    const newFile = path.join(DIR, f)
    try {
        if (!fs.existsSync(oldFile) || fs.existsSync(newFile)) continue
        try { fs.renameSync(oldFile, newFile) } catch (_) { fs.copyFileSync(oldFile, newFile); fs.unlinkSync(oldFile) }
        console.log(`[Database] ${f} dipindah dari storage/ ke database/`)
    } catch (e) { console.log(`[Database] gagal memindah ${f}:`, e.message) }
}

const DBP = (name) => path.join(DIR, name)
DBP.DIR = DIR
module.exports = DBP
