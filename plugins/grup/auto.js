const { Usage, settings, onOff } = require("./_lib.js")

const FEATURES = {
    autoread: { key: "autoread", label: "Auto Lihat Chat" },
    autotyping: { key: "autotyping", label: "Auto Ngetik" },
    autoreadsw: { key: "autoreadsw", label: "Auto Lihat SW + React 🩷" }
}
const ALIAS = { autoviewsw: "autoreadsw", autolihatsw: "autoreadsw", autoswread: "autoreadsw", autotype: "autotyping", autoketik: "autotyping" }

module.exports = {
    name: "auto",
    command: [...Object.keys(FEATURES), ...Object.keys(ALIAS)],
    desc: "Auto lihat chat / ngetik / lihat SW (owner)",
    usage: "on/off",
    example: "on",
    ownerOnly: true,
    async run({ m, command, args, prefix }) {
        const f = FEATURES[ALIAS[command] || command]
        const st = settings()
        const val = onOff(args[0] || "")
        if (val === null) throw new Usage(`*${f.label}* : ${st[f.key] ? "Aktif" : "Mati"}\n\nPakai: ${prefix}${command} on/off`)
        st[f.key] = val
        await m.reply(`*${f.label}* ${val ? "dinyalakan" : "dimatikan"}.`)
    }
}
