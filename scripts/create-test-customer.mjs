// One-off: create (or reset) a TEST customer login for local/dev use.
// Uses the Supabase service-role key from .env.local — the key is read at
// runtime and NEVER printed. Only the resulting email + password are shown.
//
//   node scripts/create-test-customer.mjs [email] [password]
//
// A customer = an auth.users row + a public.profiles row with
// role='customer', is_active=true, account_status='active'.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── load .env.local (simple parser; no external dep) ─────────────────────────
function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv(new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const email = (process.argv[2] || "testkund@intennze.se").toLowerCase();
// Readable but strong default password (override via argv).
const password = process.argv[3] || `Testkund-${Math.floor(1000 + Math.random() * 9000)}!`;

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUserByEmail(target) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  let userId;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { test_account: true },
  });

  if (created.error) {
    const already = /already|registered|exists/i.test(created.error.message);
    if (!already) throw created.error;
    const existing = await findUserByEmail(email);
    if (!existing) throw created.error;
    userId = existing.id;
    // Reset the password so the printed credentials are valid.
    const upd = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (upd.error) throw upd.error;
    console.log("• Auth user already existed — password reset.");
  } else {
    userId = created.data.user.id;
    console.log("• Auth user created.");
  }

  // Upsert the customer profile (active + confirmed).
  const { error: pErr } = await admin.from("profiles").upsert(
    {
      user_id: userId,
      role: "customer",
      is_active: true,
      account_status: "active",
      must_change_password: false,
      email,
      first_name: "Test",
      last_name: "Kund",
    },
    { onConflict: "user_id" }
  );
  if (pErr) throw pErr;
  console.log("• Customer profile ensured (role=customer, active).");

  console.log("\n================ TEST CUSTOMER LOGIN ================");
  console.log("  URL:      /login   (then /portal)");
  console.log(`  E-post:   ${email}`);
  console.log(`  Lösenord: ${password}`);
  console.log("=====================================================\n");
}

main().catch((e) => {
  console.error("FAILED:", e?.message || e);
  process.exit(1);
});
