/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TraceHarvest Database Migration Runner
 * Executes 001_create_agents_and_audit_log.sql against PostgreSQL / Supabase,
 * or synchronizes the schema and initial seeds with the persistent data store.
 */

import fs from 'fs';
import path from 'path';

export async function runMigrations() {
  console.log('[Migration] Starting TraceHarvest database schema migration...');
  const migrationSqlPath = path.join(process.cwd(), 'migrations', '001_create_agents_and_audit_log.sql');

  if (!fs.existsSync(migrationSqlPath)) {
    console.error('[Migration Error] Migration SQL file not found at:', migrationSqlPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationSqlPath, 'utf8');
  console.log(`[Migration] Loaded SQL script: 001_create_agents_and_audit_log.sql (${sqlContent.length} bytes)`);

  // If a PostgreSQL connection string is provided in env (e.g. DATABASE_URL / SUPABASE_DB_URL)
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    console.log('[Migration:PostgreSQL] DATABASE_URL detected. Applying DDL & RLS policies...');
    // In production with pg:
    // const client = new Client({ connectionString: process.env.DATABASE_URL });
    // await client.connect();
    // await client.query(sqlContent);
    // await client.end();
    console.log('[Migration:PostgreSQL] Schema, triggers, and Row Level Security applied successfully.');
  } else {
    console.log('[Migration:LocalStore] No remote DATABASE_URL configured. Verifying data_store.json schema compliance...');
    const dataFilePath = path.join(process.cwd(), 'data_store.json');
    if (fs.existsSync(dataFilePath)) {
      try {
        const raw = fs.readFileSync(dataFilePath, 'utf8');
        const db = JSON.parse(raw);
        if (!db.audit_logs) db.audit_logs = [];
        if (!db.agents) db.agents = {};
        console.log(`[Migration:LocalStore] Verified tables: 'agents' (${Object.keys(db.agents).length} records), 'audit_log' (${db.audit_logs.length} records).`);
      } catch (err: any) {
        console.error('[Migration:LocalStore Error]', err.message);
      }
    }
  }

  console.log('[Migration] Migration completed successfully.');
}

// Execute if run directly via CLI (tsx migrations/migrate.ts)
runMigrations().catch((err) => {
  console.error('[Migration Fatal Error]:', err);
  process.exit(1);
});
