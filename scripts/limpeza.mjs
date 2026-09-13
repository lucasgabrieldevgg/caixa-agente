#!/usr/bin/env node
/* Limpeza de caixas expiradas do Firebase RTDB.
 * Roda via GitHub Action (cron diário). Precisa do secret FIREBASE_SERVICE_ACCOUNT.
 * Regra: apaga boxes/{codigo} cujo `criado` (última mensagem) seja mais antigo que TTL_DIAS dias.
 */
import { readFileSync } from 'node:fs';

let raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
if (!raw) {
  console.log('⚠️  Secret FIREBASE_SERVICE_ACCOUNT ausente — limpeza pulada.');
  console.log('   Configure em: repo → Settings → Secrets and variables → Actions.');
  process.exit(0);
}
if (!raw.startsWith('{')) {
  try { raw = Buffer.from(raw, 'base64').toString('utf8'); } catch {}
}
let sa;
try { sa = JSON.parse(raw); }
catch (e) { console.error('❌ Secret não é um JSON válido de service account:', e.message); process.exit(1); }

const { initializeApp, cert } = await import('firebase-admin/app');
const { getDatabase } = await import('firebase-admin/database');

const DB_URL = sa.databaseURL || 'https://caixa-agente-default-rtdb.firebaseio.com';
initializeApp({ credential: cert(sa), databaseURL: DB_URL });

const TTL_DIAS = parseInt(process.env.TTL_DIAS || '7', 10);
const corte = Date.now() - TTL_DIAS * 86400000;

const snap = await getDatabase().ref('boxes').once('value');
const total = snap.numChildren();
const vencidas = [];
snap.forEach(ch => {
  const v = ch.val() || {};
  const t = typeof v.criado === 'number' ? v.criado : 0;
  if (t && t < corte) vencidas.push(ch.key);
});

console.log(`Varredura: ${total} caixa(s) · TTL ${TTL_DIAS} dias · ${vencidas.length} vencida(s)`);
let removidas = 0;
for (const code of vencidas) {
  try {
    await getDatabase().ref('boxes/' + code).remove();
    removidas++;
    console.log('  🗑 removida:', code);
  } catch (e) {
    console.error('  ❌ falha ao remover', code, e.message);
  }
}
console.log(`✅ Fim: ${removidas} caixa(s) removida(s).`);
