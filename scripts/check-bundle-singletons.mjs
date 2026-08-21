#!/usr/bin/env node
/**
 * Falha se um pacote que precisa ser singleton aparecer no bundle em mais de
 * um arquivo (ESM + CJS, por exemplo).
 *
 * Motivo: `@firebase/app` e `@firebase/component` guardam o registro de
 * componentes em estado de módulo. Duas cópias no mesmo bundle = dois
 * registros: `initializeApp` cria o app em uma e o build React Native do auth
 * registra o componente na outra, e o app quebra no boot com
 * "Component auth has not been registered yet" — foi o que aconteceu no
 * upgrade para o SDK 54, quando o Metro passou a resolver `exports` por
 * padrão e a mesma dependência virou dois arquivos (condição import x require).
 *
 * Uso: node scripts/check-bundle-singletons.mjs <arquivo.map>
 */

import { readFileSync } from "node:fs";

const SINGLETONS = ["@firebase/app", "@firebase/component"];

// No bundle nativo, `firebase/auth` PRECISA resolver para o build React
// Native: é o único que exporta `getReactNativePersistence`. Sem ele a sessão
// cai para memória e todo mundo reloga a cada abertura do app — foi o que
// aconteceu quando o lock regerado aninhou o @firebase/auth.
const NATIVE_AUTH_BUILD = "@firebase/auth/dist/rn/";

const mapPath = process.argv[2];
if (!mapPath) {
  console.error("uso: node scripts/check-bundle-singletons.mjs <arquivo.map>");
  process.exit(2);
}

const { sources } = JSON.parse(readFileSync(mapPath, "utf8"));

let failed = false;
for (const pkg of SINGLETONS) {
  // Só os arquivos do próprio pacote (…/node_modules/<pkg>/…), não de quem o consome.
  const marker = `/node_modules/${pkg}/`;
  const files = [...new Set(sources.filter((s) => s.includes(marker)))];
  if (files.length > 1) {
    failed = true;
    console.error(`✖ ${pkg}: ${files.length} cópias no bundle`);
    files.forEach((f) => console.error(`    ${f}`));
  } else {
    console.log(`✔ ${pkg}: ${files.length} cópia`);
  }
}

// Só o bundle android/ios; no web o build de browser é o correto.
const isNativeBundle = /\/(android|ios)\//.test(mapPath);
if (isNativeBundle) {
  const hasRnAuth = sources.some((s) => s.includes(NATIVE_AUTH_BUILD));
  const hasAnyAuth = sources.some((s) => s.includes("@firebase/auth/"));
  if (hasAnyAuth && !hasRnAuth) {
    failed = true;
    console.error(
      `✖ firebase/auth: bundle nativo sem o build React Native (${NATIVE_AUTH_BUILD})`,
    );
    console.error("    a sessão não persistiria — o usuário relogaria sempre");
  } else if (hasRnAuth) {
    console.log("✔ firebase/auth: build React Native no bundle nativo");
  }
}

if (failed) {
  console.error(
    "\nDuas cópias de um pacote singleton quebram o registro de componentes " +
      "do Firebase em runtime. Ver metro.config.js (unstable_enablePackageExports).",
  );
  process.exit(1);
}
