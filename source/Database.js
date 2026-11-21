
/*
   Fuyuha Shina Multi Device
   Owner: Megumi Kaito
*/

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

global.tempatDB = "database.json";

class DataBase {
    constructor() {
        this.file = require("./DbPath.js")(global.tempatDB);
        this.client = null;
        this.collection = null;
        this.writeQueue = Promise.resolve();
        this.isMongo = Boolean(global.mongoUrl);
    }

    read = async () => {
        if (this.isMongo) {
            this.client = new MongoClient(global.mongoUrl, {
                serverSelectionTimeoutMS: 15000
            });

            await this.client.connect();

            const db = this.client.db();
            this.collection = db.collection("bot_database");

            const result = await this.collection.findOne({ _id: "main" });

            if (!result) {
                const initialData = {
                    users: {},
                    groups: {},
                    settings: {},
                    guilds: {}
                };

                await this.collection.insertOne({
                    _id: "main",
                    data: initialData
                });

                return initialData;
            }

            return result.data || {};
        }

        if (!fs.existsSync(this.file)) {
            return {};
        }

        try {
            const raw = await fs.promises.readFile(this.file, "utf8");
            const parsed = JSON.parse(raw || "{}");

            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("Struktur database bukan object JSON.");
            }

            return parsed;
        } catch (err) {
            throw new Error(
                `[Database] Gagal membaca ${this.file}: ${err.message}`
            );
        }
    };

    write = async (data) => {
        const snapshot = JSON.parse(JSON.stringify(data || {}));

        this.writeQueue = this.writeQueue.then(async () => {
            if (this.isMongo) {
                if (!this.collection) {
                    throw new Error("MongoDB belum terhubung.");
                }

                await this.collection.updateOne(
                    { _id: "main" },
                    { $set: { data: snapshot } },
                    { upsert: true }
                );

                return;
            }

            const dirname = path.dirname(this.file);
            await fs.promises.mkdir(dirname, { recursive: true });

            const tempFile = `${this.file}.tmp`;

            await fs.promises.writeFile(
                tempFile,
                JSON.stringify(snapshot, null, 2),
                "utf8"
            );

            await fs.promises.rename(tempFile, this.file);
        });

        return this.writeQueue;
    };
}

module.exports = DataBase;
