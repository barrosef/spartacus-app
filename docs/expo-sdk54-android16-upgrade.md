# Upgrade Expo SDK 52 → 54 (Android 16 / API 36)

Runbook de migração. **Executar depois do lançamento iOS** (decisão: iOS primeiro, Android 16 depois).

## Context

O Google Play exige que novas versões segmentem **API 36 (Android 16)** a partir de **30/ago/2026**;
caso contrário, o upload de novos builds é **bloqueado** (apps já instalados seguem funcionando). Hoje o
app está em **Expo SDK 52 · RN 0.76.9 · `targetSdkVersion: 35`** (pin em `expo-build-properties`).

Segmentar API 36 **força edge-to-edge sem opção de opt-out** — não há caminho "só trocar o número". A
correção durável e suportada é subir para **Expo SDK 54** (RN 0.81), que segmenta API 36 nativamente,
traz o AGP/build-tools corretos e trata edge-to-edge de forma oficial (bônus: build iOS muito mais rápido
via XCFrameworks pré-compilados). Verificar no momento da execução se há SDK estável > 54 e mirar o mais
recente que segmente API 36.

Refs: [Expo SDK 54](https://expo.dev/changelog/sdk-54) · [RN 0.81 / Android 16](https://reactnative.dev/blog/2025/08/12/react-native-0.81) · [build-properties](https://docs.expo.dev/versions/latest/sdk/build-properties/)

## Estado atual (pré-upgrade)

| Item | Valor |
|---|---|
| expo | `^52.0.0` |
| react-native / react | `0.76.9` / `18.3.1` |
| New Architecture | **OFF** (default do SDK 52; sem `newArchEnabled` no app.json) |
| compile/target SDK | `35` / `35` (pin em `expo-build-properties`, app.json) |
| Navegação | React Navigation v6 (`native-stack` + `stack`) + `react-native-screens ~4.4.0` |
| Safe area | `react-native-safe-area-context 4.12.0` (`SafeAreaProvider` em `src/App.tsx`) |

## Áreas de risco (achados concretos)

1. **New Architecture (ligada por padrão no SDK 54).** Auditar compatibilidade dos módulos nativos. Os
   Expo (`expo-*`), `react-native-screens`, `-safe-area-context`, `-gesture-handler`, `async-storage`,
   `datetimepicker` já suportam. **Risco:** `react-native-share ^12.3.1` e `expo-share-intent ^3.2.3` —
   confirmar versão compatível com New Arch/SDK 54. **Estratégia de de-risking:** subir com
   `newArchEnabled: false` no primeiro build (isola variáveis), validar, depois ligar New Arch em build
   separado.
2. **Edge-to-edge forçado (API 36).** Corrigir `src/components/ui/SafeScreen.tsx` — hoje importa
   `SafeAreaView` de **`react-native`** (iOS-only, ignora insets no Android). Trocar pelo `SafeAreaView`
   de `react-native-safe-area-context` (como já é feito nas demais telas). Depois, varrer telas: garantir
   inset **bottom** onde houver conteúdo colado na barra de navegação (hoje o padrão é `edges={["top"]}`).
3. **React 18 → 19.1.** Revisar mudanças (ex.: `ref` como prop, remoção de APIs legadas, mudanças de
   tipos `@types/react` 18→19). Rodar `typecheck` e testar.
4. **RuntimeVersion `fingerprint`.** Build nativo novo → novo fingerprint → OTA **não** alcança builds
   antigos. É esperado: distribuir via loja (não dá pra corrigir esse upgrade por OTA).
5. **Firebase JS SDK (`^10`).** Não é módulo nativo; risco baixo. Opcional: alinhar versão.

## Passos

### 1. Preparação
- Branch de trabalho (fluxo do projeto: commits em `dev`; considerar um período de estabilização).
- Ler os breaking changes de **SDK 53** (RN 0.79, React 19, New Arch default) **e 54** (RN 0.81, API 36,
  edge-to-edge). O salto 52→54 é direto, mas os dois changelogs se aplicam.

### 2. Bump do SDK e dependências
```bash
cd repos/app
npx expo install expo@^54.0.0   # ou o mais recente ≥54
npx expo install --fix          # alinha todos os expo-* e libs conhecidas ao SDK
```
- Bumps esperados: `react-native@0.81.x`, `react@19.1`, `react-dom@19.1`, `@types/react@19`, todos os
  `expo-*`, `react-native-screens`, `-safe-area-context`, `-gesture-handler`, `async-storage`,
  `datetimepicker`, `@expo/metro-runtime`, `react-native-web`.
- **Manual (não cobertos pelo --fix):** `react-native-share` e `expo-share-intent` → subir para a versão
  compatível com SDK 54 / New Arch (checar READMEs). `@react-navigation/*` v6 deve seguir; avaliar v7 só
  se necessário.

### 3. Config nativa (`app.json`)
- Em `expo-build-properties.android`: **remover** os pins `compileSdkVersion: 35` / `targetSdkVersion: 35`
  (o SDK 54 já usa 36 por padrão) — ou setar explicitamente `35`→`36` + `buildToolsVersion: "36.0.0"` se
  quiser fixar. Manter `enableProguard*`/`enableShrinkResources`.
- New Arch: no primeiro build de validação, adicionar `"newArchEnabled": false` em `expo` (de-risking).
  Remover (voltar ao default ON) num segundo build, após validar os módulos de risco.
- iOS (config já criada no lançamento iOS): revalidar após o upgrade — `deploymentTarget` mínimo do RN
  0.81, `expo-build-properties.ios` se necessário.

### 4. Ajustes de código
- `src/components/ui/SafeScreen.tsx`: `SafeAreaView` de `react-native` → de `react-native-safe-area-context`.
- Varredura edge-to-edge: telas com listas/botões colados no rodapé precisam de inset bottom (usar
  `edges={["top","bottom"]}` ou `useSafeAreaInsets`).
- `expo-status-bar`/barra de status: conferir contraste sob edge-to-edge (fundo `#0B0D12`).
- Corrigir quaisquer erros de `typecheck`/`lint` decorrentes de RN 0.81 / React 19.

### 5. Validação (ver seção Verification)
### 6. Release
- `versionCode`/`buildNumber` sobem pelo passo de auto-increment do CI (`.github/workflows/ci.yml`).
- Publicar em **track internal** (Play) primeiro; validar em device Android 16; depois promover.
- **Após o upgrade, re-testar o app iOS** (decisão iOS-primeiro implica re-teste do iOS no SDK novo).

## Execução (2026-08-16) — o que o upgrade realmente exigiu

Executado com `expo@54.0.36` · `react-native@0.81.5` · `react@19.1.0`, **New Arch OFF** no primeiro build.
Além dos passos previstos, foram necessários estes ajustes (nenhum estava no plano original):

| Achado | Correção |
|---|---|
| `npm install` falhava por peer conflict (react 18 no lock antigo vs `react-native@0.81` que exige react ^19.1) | Regenerar `package-lock.json` do zero (`rm -rf node_modules package-lock.json && npm install`) |
| `expo-share-intent@3.2.3` só aceita expo ^52 | Subir para `^5.1.1` (faixa que peer-depende de expo ^54) |
| `@expo/vector-icons` deixou de vir junto do pacote `expo` | Declarar como dependência direta (`npx expo install @expo/vector-icons`) |
| `babel-preset-expo` idem — `typecheck`/`lint` passam sem ele, mas **todo bundle** quebra (`Cannot find module 'babel-preset-expo'`, via `babel.config.js`); só apareceu no CI, derrubando build Android e PWA | Declarar como dependência direta. Validar upgrade com `npx expo export --platform android` **e** `--platform web` antes de mergear — typecheck não cobre bundle |
| `tsconfig.json` sobrescrevia `module`/`moduleResolution` com CommonJS/node → TS5098 contra o `customConditions` do `expo/tsconfig.base` do SDK 54 | Remover os overrides e herdar da base |
| `expo-notifications`: `shouldShowAlert` deprecated | `shouldShowBanner` + `shouldShowList` em `src/lib/pushNotifications.ts` |
| `expo-file-system@19` promoveu a API nova no entrypoint padrão (`cacheDirectory` sumiu) | `import * as FileSystem from "expo-file-system/legacy"` em `src/lib/share/shareMedia.ts` |
| React 19 removeu o namespace global `JSX` | `React.JSX.Element` em `src/components/staff/FilterPanel.tsx` |
| `react-native-share@12.3.1` | Mantido — é a última versão e não declara peers restritivos |

Config nativa: `compileSdkVersion`/`targetSdkVersion` **36** + `buildToolsVersion 36.0.0` (fixados
explicitamente, não removidos) e `newArchEnabled: false` no `app.json`. `npx expo prebuild -p android`
gera `android.targetSdkVersion=36` e `edgeToEdgeEnabled=true` — requisito da Play confirmado.

Validação local: `typecheck` ✅ · `lint` ✅ (1 warning pré-existente) · `expo-doctor` 18/18 ✅ · prebuild android ✅.
**Pendente:** teste em device/emulador Android 16 e o segundo build com New Arch ON.

## Verification

```bash
cd repos/app
npm run typecheck && npm run lint
npx expo-doctor            # checagem de compatibilidade de deps do SDK
# build de validação (New Arch OFF primeiro):
eas build -p android --profile preview --non-interactive
```
Em **device/emulador Android 16 (API 36)**:
- App abre, login Google (Firebase) OK, navegação e safe-area corretas (**sem conteúdo atrás das
  barras** — checar topo e rodapé).
- Fluxos com módulos de risco: **compartilhar** (react-native-share / expo-share-intent),
  **notificações**, **image/document picker**, **datetimepicker**.
- Repetir com **New Arch ON** (segundo build) e comparar.
- Só então promover no Play e re-testar o build **iOS** no SDK novo.

## Rollback
- Reverter o commit do upgrade (deps + app.json) e reconstruir no SDK 52 — enquanto **antes de 30/ago/2026**
  ainda é possível publicar com target 35. Depois dessa data, o rollback deixa de permitir novos uploads no
  Play, então concluir o upgrade com folga do prazo.

## Sequência recomendada
1. Concluir lançamento iOS (SDK 52) — ver [`ios-appstore-setup.md`](./ios-appstore-setup.md).
2. Executar este upgrade (52→54), New Arch OFF → validar → New Arch ON → validar.
3. Release Android track internal → device Android 16 → produção.
4. Re-testar iOS no SDK 54 e re-submeter se necessário.
