/*
  Cek owner yang tahan LID.
  WhatsApp sekarang sering mengirim pengirim sebagai "xxxx@lid", bukan "628xx@s.whatsapp.net",
  jadi perbandingan langsung dengan global.owner gagal -> "Fitur ini hanya untuk ownerbot".

  Nomor owner (global.owner di settings.js, + global.ownerExtra) dicocokkan lewat 4 cara:
    1. nomor langsung   2. global.ownerLid (isi manual, opsional)
    3. info nomor asli di metadata pesan   4. LID owner dicari OTOMATIS dari nomornya (dan disimpan, jadi sekali cari saja)
  Jadi cukup ganti nomor di settings.js, owner baru langsung bisa akses tanpa isi LID manual.
*/
const clean = (j = "") => String(j).split(":")[0].split("@")[0]

// nomor owner -> kumpulan LID-nya (hasil pencarian otomatis, disimpan di memori)
const lidCache = new Map()

async function lidsOf(sock, number) {
  if (lidCache.has(number)) return lidCache.get(number)
  const found = new Set()
  try {
    const lid = await sock.signalRepository?.lidMapping?.getLIDForPN?.(number + "@s.whatsapp.net")
    if (lid) found.add(clean(lid))
  } catch {}
  try {
    const res = await sock.onWhatsApp?.(number)
    for (const r of res || []) if (r && r.lid) found.add(clean(r.lid))
  } catch {}
  // hanya disimpan kalau ketemu, supaya kalau belum ketemu dicoba lagi di pesan berikutnya
  if (found.size) lidCache.set(number, found)
  return found
}

module.exports = async (sock, m, extra = []) => {
  try {
    if (m.fromMe) return true

    const owners = [global.owner, ...(global.ownerExtra || [])].filter(Boolean).map(clean)
    const lids = (global.ownerLid || []).filter(Boolean).map(clean)
    const devs = (extra || []).map(clean)
    const sender = clean(m.sender)

    if (owners.includes(sender) || lids.includes(sender) || devs.includes(sender)) return true

    // kandidat nomor asli dari metadata pesan
    const key = m.key || {}
    const alts = [key.senderPn, key.participantPn, key.participantAlt, key.remoteJidAlt]
      .filter(Boolean).map(clean)
    if (alts.some(n => owners.includes(n) || devs.includes(n))) return true

    if (String(m.sender).endsWith("@lid")) {
      // cari lewat mapping LID -> nomor milik baileys
      const map = sock.signalRepository?.lidMapping
      for (const arg of [m.sender, clean(m.sender)]) {
        try {
          const pn = await map?.getPNForLID?.(arg)
          if (pn && (owners.includes(clean(pn)) || devs.includes(clean(pn)))) return true
        } catch {}
      }
      // cari LID milik nomor owner (otomatis), lalu cocokkan dengan pengirim
      for (const n of owners) {
        if ((await lidsOf(sock, n)).has(sender)) return true
      }
      console.log("[OwnerCheck] pengirim LID tidak dikenali:", m.sender,
        "-> kalau ini nomor owner kamu, isi global.ownerLid di settings.js")
    }
  } catch (e) {
    console.log("[OwnerCheck] error:", e.message)
  }
  return false
}
