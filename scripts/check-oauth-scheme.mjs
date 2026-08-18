#!/usr/bin/env node
/**
 * Garante que o app registra o scheme usado pelo retorno do login Google.
 *
 * O provider do `expo-auth-session` monta o redirect como
 * `${Application.applicationId}:/oauthredirect` — ou seja, o próprio
 * applicationId como scheme. Até o SDK 52 o prebuild injetava esse scheme no
 * AndroidManifest automaticamente; o SDK 54 parou, e o login passou a morrer
 * no navegador: o Google concluía, não havia handler para o redirect e o
 * Chrome caía no google.com. Nada disso aparece em lint, typecheck ou bundle.
 *
 * Uso: node scripts/check-oauth-scheme.mjs
 */

import { readFileSync } from "node:fs";

const { expo } = JSON.parse(readFileSync("app.json", "utf8"));

const schemes = Array.isArray(expo.scheme)
  ? expo.scheme
  : [expo.scheme].filter(Boolean);

let failed = false;
for (const [platform, appId] of [
  ["android", expo.android?.package],
  ["ios", expo.ios?.bundleIdentifier],
]) {
  if (!appId) continue;
  if (!schemes.includes(appId)) {
    failed = true;
    console.error(
      `✖ ${platform}: "${appId}" não está em expo.scheme (${schemes.join(", ")}).\n` +
        `  O retorno do login Google (${appId}:/oauthredirect) ficaria sem handler.`,
    );
  } else {
    console.log(`✔ ${platform}: scheme "${appId}" registrado`);
  }
}

process.exit(failed ? 1 : 0);
