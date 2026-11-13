const { Usage, needAdmin, gdata, onOff } = require("./_lib.js")

// nama fitur -> kunci di database grup
const FEATURES = {
    antilinkch: { key: "antilinkch", label: "Anti Link Saluran", needBot: true },
    antitagch: { key: "antitagch", label: "Anti Tag Saluran", needBot: true },
    antitagsw: { key: "antitagsw", label: "Anti Tag SW", needBot: true },
    antisw: { key: "antisw", label: "Anti SW Grup", needBot: true },
    antitoxic: { key: "antitoxic", label: "Anti Toxic", needBot: true },
    antibokep: { key: "antibokep", label: "Anti Bokep", needBot: true },
    antidel: { key: "antidel", label: "Anti Delete", needBot: false }
}
const ALIAS = {
    antilinksaluran: "antilinkch", antilinkchannel: "antilinkch",
    antitagsaluran: "antitagch", antitagchannel: "antitagch",
    antiswgc: "antisw", antiswgb: "antisw", antistatusgrup: "antisw",
    antidelete: "antidel", antihapus: "antidel"
}

module.exports = {
    name: "anti",
    command: [...Object.keys(FEATURES), ...Object.keys(ALIAS)],
    desc: "Nyalakan/matikan anti-anti di grup",
    usage: "on/off",
    example: "on",
    async run({ m, command, args, prefix, isOwner }) {
        needAdmin(m, isOwner)
        const f = FEATURES[ALIAS[command] || command]
        const g = gdata(m.chat)
        const val = onOff(args[0] || "")
        if (val === null) throw new Usage(`*${f.label}* : ${g[f.key] ? "Aktif" : "Mati"}\n\nPakai: ${prefix}${command} on/off`)
        g[f.key] = val
        let note = ""
        if (val && f.needBot && !m.isBotAdmin) note = "\n\n⚠️ Bot belum jadi admin grup, jadi belum bisa menghapus pesan. Jadikan bot admin dulu."
        await m.reply(`${val ? "Berhasil menyalakan" : "Berhasil mematikan"} *${f.label}* di grup ini.${note}`)
    }
}
