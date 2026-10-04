import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carregar variáveis do .env se existir
const envPath = path.resolve(__dirname, "../.env");
let defaultProjectId = "qgiiqdklkufmobikwipe";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const match = envContent.match(/VITE_SUPABASE_URL=https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
  if (match?.[1]) {
    defaultProjectId = match[1];
  }
}

// Arquivo de migração padrão ou passado via argumento
const migrationArg = process.argv.find((arg) => arg.endsWith(".sql"));
const migrationFile = migrationArg || "02_unique_cpf_por_clinica.sql";
const schemaPath = path.isAbsolute(migrationFile)
  ? migrationFile
  : path.resolve(__dirname, `../supabase/${migrationFile}`);

async function main() {
  console.log("=== Aplicador de Migração do Copiloto Med ===");

  if (!fs.existsSync(schemaPath)) {
    console.error("Arquivo de migração não encontrado em:", schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, "utf-8");
  console.log(`Lido arquivo ${path.basename(schemaPath)} (${sql.length} caracteres).`);

  const connectionString =
    process.env.DATABASE_URL ||
    process.argv.find((a) => a.startsWith("postgresql://") || a.startsWith("postgres://"));
  const accessToken =
    process.env.SUPABASE_ACCESS_TOKEN ||
    process.argv.find((a) => a.startsWith("sbp_"));
  const projectId = process.env.SUPABASE_PROJECT_ID || defaultProjectId;

  // Tentativa 1: Via Management API do Supabase (se tiver Personal Access Token)
  if (accessToken && accessToken.startsWith("sbp_")) {
    console.log(`Conectando via Supabase Management API para o projeto '${projectId}'...`);
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });
      if (res.ok) {
        console.log("✓ Migração aplicada com sucesso via Supabase Management API!");
        process.exit(0);
      } else {
        const text = await res.text();
        console.error("Falha na Management API:", res.status, text);
      }
    } catch (e) {
      console.error("Erro na Management API:", e.message);
    }
  }

  // Tentativa 2: Via conexão direta PostgreSQL (se tiver connectionString ou DATABASE_URL)
  if (connectionString) {
    console.log("Conectando diretamente ao PostgreSQL...");
    try {
      const { default: pg } = await import("pg");
      const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      console.log("Conectado ao PostgreSQL do Supabase!");
      await client.query(sql);
      console.log("✓ Migração executada com sucesso no PostgreSQL!");
      await client.end();
      process.exit(0);
    } catch (e) {
      console.error("Erro ao conectar no Postgres:", e.message);
    }
  }

  console.log("\n--------------------------------------------------------------");
  console.log(`Projeto Supabase ativo: ${projectId}`);
  console.log("Para executar esta migração automaticamente via terminal:");
  console.log("1. Passe a Connection String do banco:");
  console.log(
    `   node scripts/apply-migration.mjs 'postgresql://postgres:[SENHA]@db.${projectId}.supabase.co:5432/postgres'`,
  );
  console.log("\n2. Ou passe seu Personal Access Token do Supabase (sbp_...):");
  console.log("   $env:SUPABASE_ACCESS_TOKEN='sbp_...'; node scripts/apply-migration.mjs");
  console.log("\n3. Ou copie o script 'supabase/02_unique_cpf_por_clinica.sql' e cole no SQL Editor:");
  console.log(`   https://supabase.com/dashboard/project/${projectId}/sql/new`);
  console.log("--------------------------------------------------------------\n");
}

main().catch(console.error);
