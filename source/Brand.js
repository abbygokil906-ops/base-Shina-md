/*
  Brand — identitas owner bot ini (Fuyuha Shina Multi Device).
  Diambil langsung dari settings.js (global.owner / global.namaOwner / global.linkOwner), jadi
  tinggal edit settings.js kalau mau ganti, gak perlu ngoprek file ini.
  Tombol promosi "Order Panel Murah" / "Sumber Script" / "Script VVIP" punya script asli (NihiluxMD)
  udah dihapus total - lihat source/Menu.js.
*/
module.exports = Object.freeze({
    hak: Object.freeze({
        nomor: global.owner || "",
        nama: global.namaOwner || global.namaBot || "Fuyuha Shina MD",
        link: global.linkOwner || ""
    }),
    orderUrl: "",
    orderLabel: "",
    sumberUrl: "",
    sumberLabel: "",
    vipLabel: "",
    vipText: "",
    vipChat: ""
})
