const { HTTP, Usage, tool } = require("./_lib.js")

module.exports = tool({
    name: "web2apk",
    command: ["web2apk"],
    endpoint: "web2apk",
    desc: "Ubah website jadi APK",
    usage: "<link>|<nama app>|<package>|<versi>  (cukup link, sisanya opsional)",
    example: "https://example.com|Toko Saya|com.toko.saya|1.0.0",
    needs: "text",
    output: "document",
    timeout: 300000,
    params: ({ text }) => {
        const [url, appName, packageName, versionName] = text.split(/\s*\|\s*/)
        if (!HTTP.test(url || "")) throw new Usage()
        const base = new URL(url).hostname.replace(/^www\./, "").split(".")[0]
        return {
            url,
            appName: appName || base.charAt(0).toUpperCase() + base.slice(1),
            packageName: packageName || "com.web." + (base.replace(/[^a-z0-9]/gi, "").toLowerCase() || "app"),
            versionName: versionName || "1.0.0"
        }
    }
})
