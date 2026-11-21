/*
  Lokasi database bot: <root>/database
  Migrasi legacy: <root>/storage/database.json
*/

const fs = require("fs");
const path = require("path");

const DIR = path.join(process.cwd(), "database");
const LEGACY = path.join(process.cwd(), "storage");
const FILES = ["database.json"];

fs.mkdirSync(DIR, { recursive: true });

for (const fileName of FILES) {
    const oldFile = path.join(LEGACY, fileName);
    const newFile = path.join(DIR, fileName);

    try {
        if (!fs.existsSync(oldFile)) continue;

        const oldStat = fs.statSync(oldFile);
        if (!oldStat.isFile() || oldStat.size === 0) continue;

        let shouldCopy = !fs.existsSync(newFile);

        if (!shouldCopy) {
            const newStat = fs.statSync(newFile);

            // File tujuan kosong, sedangkan file lama berisi data:
            // pulihkan dari file lama.
            shouldCopy = newStat.isFile() && newStat.size === 0;
        }

        if (!shouldCopy) continue;

        fs.copyFileSync(oldFile, newFile);
        console.log(`[Database] Data lama ${fileName} dipulihkan dari storage/`);
    } catch (err) {
        console.error(`[Database] Gagal memulihkan ${fileName}:`, err.message);
    }
}

const DBP = (name) => {
    fs.mkdirSync(DIR, { recursive: true });
    return path.join(DIR, name);
};

DBP.DIR = DIR;
module.exports = DBP;