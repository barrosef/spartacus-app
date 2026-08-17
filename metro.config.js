const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Firebase 10 distribui bundles .cjs que Metro não processa por padrão
config.resolver.sourceExts = [...config.resolver.sourceExts, "cjs"];

// O SDK 53+ liga a resolução por `exports` do package.json por padrão. Com ela,
// o `@firebase/app` entra no bundle DUAS vezes — importadores ESM caem na
// condição `import` e o build React Native do auth, que é CJS, cai na `require`.
// São dois módulos distintos, cada um com seu registro de componentes: o
// `initializeApp` cria o app em um e o auth se registra no outro, e o app
// quebra no boot com "Component auth has not been registered yet".
// Desligar restaura a resolução por main/browser (comportamento do SDK 52),
// que dá uma instância só. Guardado por scripts/check-bundle-singletons.mjs.
// Remover quando o firebase-js-sdk subir para >= 11 (exports com condição RN).
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
