"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../src/config/db");
async function runMigrations() {
    const migrationsDir = path.resolve(__dirname, '../db/migrations');
    if (!fs.existsSync(migrationsDir)) {
        console.log('[db:migrate] No migrations directory found.');
        return;
    }
    const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
    await (0, db_1.withClient)(async (client) => {
        // Ensure migrations table exists
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename)
      );
    `);
        // Get already applied migrations
        const res = await client.query('SELECT filename FROM schema_migrations');
        const applied = new Set(res.rows.map((r) => r.filename));
        const pending = files.filter((f) => !applied.has(f));
        if (pending.length === 0) {
            console.log('[db:migrate] Nothing to do — all migrations already applied.');
            return;
        }
        console.log(`[db:migrate] ${pending.length} pending migration(s) found:`);
        for (const file of pending) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
                await client.query('COMMIT');
                console.log(`  ✓ Applied: ${file}`);
            }
            catch (err) {
                await client.query('ROLLBACK');
                console.error(`  ✗ Failed: ${file}`);
                throw err;
            }
        }
    });
    console.log('[db:migrate] Done.');
}
if (require.main === module) {
    runMigrations()
        .then(async () => {
        await (0, db_1.closePool)();
        process.exit(0);
    })
        .catch(async (err) => {
        console.error('[db:migrate] Migration error:', err);
        await (0, db_1.closePool)();
        process.exit(1);
    });
}
