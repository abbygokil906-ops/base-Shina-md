
const fs = require("fs")
const os = require("os")
const path = require("path")
const { promisify } = require("util")
const { execFile } = require("child_process")

const execFileAsync = promisify(execFile)

module.exports = {
    name: "To Image",
    command: ["toimg", "toimage", "topng"],
    desc: "Mengubah stiker WebP menjadi gambar PNG",

    async run({ sock, m }) {
        const sendText = (text) => sock.sendMessage(
            m.chat,
            { text },
            { quoted: m }
        )

        const quoted = m.quoted || m

        const mime =
            quoted?.msg?.mimetype ||
            quoted?.mimetype ||
            m?.mimetype ||
            ""

        if (
            !mime.startsWith("image/") &&
            !mime.includes("webp")
        ) {
            return sendText(
                "Reply stiker yang ingin diubah menjadi gambar PNG!"
            )
        }

        let tempDir

        try {
            const media = await quoted.download()

            if (!media || !media.length) {
                throw new Error("Media gagal diunduh.")
            }

            if (media.length > 20 * 1024 * 1024) {
                throw new Error("Ukuran media terlalu besar (maksimal 20 MB).")
            }

            tempDir = await fs.promises.mkdtemp(
                path.join(os.tmpdir(), "shina-toimg-")
            )

            const inputPath = path.join(tempDir, "input.webp")
            const outputPath = path.join(tempDir, "output.png")

            await fs.promises.writeFile(inputPath, media)

            // Konversi menggunakan ImageMagick
            await execFileAsync(
                "magick",
                [
                    inputPath,
                    "-define", "webp:use-threads=true"
                    "-strip",
                    "-define", "png:color-type=6",
                    outputPath
                ],
                {
                    timeout: 30000,
                    maxBuffer: 10 * 1024 * 1024
                }
            )

            const result = await fs.promises.readFile(outputPath)

            await sock.sendMessage(
                m.chat,
                {
                    image: result,
                    mimetype: "image/png",
                    fileName: "sticker.png"
                },
                { quoted: m }
            )

        } catch (err) {
            console.error("[TOIMG ERROR]", err)

            if (err.code === "ENOENT") {
                return sendText(
                    "ImageMagick belum terpasang!\nJalankan: pkg install imagemagick"
                )
            }

            await sendText(
                `Gagal mengubah stiker menjadi PNG.\n${err.message}`
            )

        } finally {
            if (tempDir) {
                await fs.promises.rm(tempDir, {
                    recursive: true,
                    force: true
                }).catch(() => {})
            }
        }
    }
}
