# iOS — Publicação na Apple App Store (passo a passo manual)

Este documento cobre **apenas as etapas manuais** que só existem nos portais da Apple e do
Firebase/Google Cloud e que **não dá para automatizar** via EAS/GitHub Actions. As mudanças de
código/config (app.json, eas.json, googleAuth.ts, CI) já estão no repositório.

> **Regra de ouro:** faça esta parte manual **antes** de habilitar o build iOS no CI — os valores
> coletados aqui (Team ID, chaves ASC, iOS Client ID, plist) são pré-requisito do pipeline funcionar.

## Contexto do projeto

| Item | Valor |
|---|---|
| Bundle Identifier iOS | `br.com.spartacus.app` (mesmo do Android — **permanente**) |
| Projeto Firebase / GCP | `spartacus-artes-marciais` (project number `820921472402`) |
| Conta Expo (owner) | `digital-business-one` |
| EAS Project ID | `9c2a3ad1-2083-45e1-bb03-3d127b554099` |
| Nome do app na loja | Spartacus |

## Valores que você vai coletar (cole depois nos arquivos indicados)

| Valor | Onde é usado | Placeholder a substituir |
|---|---|---|
| **Apple Team ID** | `eas.json` → `submit.production.ios.appleTeamId` | `REPLACE_WITH_APPLE_TEAM_ID` |
| **ASC API Key ID** | `eas.json` → `submit.production.ios.ascApiKeyId` | `REPLACE_WITH_ASC_API_KEY_ID` |
| **ASC API Key Issuer ID** | `eas.json` → `submit.production.ios.ascApiKeyIssuerId` | `REPLACE_WITH_ASC_API_KEY_ISSUER_ID` |
| **ASC API Key (`.p8`)** | GitHub Secret `ASC_API_KEY_P8` (materializado em `asc-api-key.p8` no CI) | — |
| **iOS OAuth Client ID** | `eas.json` (2×, blocos `preview`/`production` env) **e** `.github/workflows/ci.yml` (passo OTA) | `REPLACE_WITH_IOS_OAUTH_CLIENT_ID.apps.googleusercontent.com` |
| **REVERSED_CLIENT_ID** | `app.json` → `ios.infoPlist.CFBundleURLTypes[0].CFBundleURLSchemes[0]` | `REPLACE_WITH_REVERSED_CLIENT_ID` |
| **GoogleService-Info.plist** | arquivo em `repos/app/GoogleService-Info.plist` (commitado) | — |

---

## Passo 1 — Apple Developer: confirmar conta e anotar o Team ID

1. Acesse <https://developer.apple.com/account> e confirme que a membership está **ativa**.
2. Menu **Membership details** → anote o **Team ID** (10 caracteres, ex. `A1B2C3D4E5`).
   → vai em `eas.json` (`appleTeamId`).

## Passo 2 — App Store Connect API Key (para submit sem 2FA no CI)

1. Acesse <https://appstoreconnect.apple.com> → **Users and Access** → aba **Integrations** →
   **App Store Connect API** → **Team Keys**.
2. Clique **+ (Generate API Key)**. Nome: `spartacus-ci`. Access/role: **App Manager**.
3. **Baixe o arquivo `.p8`** — ⚠️ o download só é possível **uma vez**. Guarde em local seguro.
4. Anote o **Key ID** (na linha da key) e o **Issuer ID** (no topo da página).
   → Key ID e Issuer ID vão em `eas.json`. O conteúdo do `.p8` vira o GitHub Secret (Passo 8).

## Passo 3 — Criar o registro do app no App Store Connect

1. <https://appstoreconnect.apple.com> → **Apps** → **+** → **New App**.
2. Preencha:
   - **Platforms:** iOS
   - **Name:** Spartacus
   - **Primary Language:** Português (Brasil)
   - **Bundle ID:** `br.com.spartacus.app`
     - Se não aparecer na lista, registre antes em **Certificates, Identifiers & Profiles →
       Identifiers → +** (App IDs → App), description "Spartacus", Bundle ID explicit
       `br.com.spartacus.app`, e habilite a capability **Push Notifications**.
     - Alternativa: o `eas credentials`/`eas build` do Passo 9 também registra o Bundle ID
       automaticamente no portal.
   - **SKU:** `spartacus-ios` (identificador interno livre)
3. Após criar, em **App Information** anote o **Apple ID (ascAppId)** — número que identifica o app.

## Passo 4 — APNs Auth Key (push no iOS)

1. **Certificates, Identifiers & Profiles → Keys → +**.
2. Nome: `spartacus-apns`. Marque **Apple Push Notifications service (APNs)**. Continue → **Register**.
3. **Baixe o `.p8`** (download único) e anote o **Key ID**.
4. Suba a chave no EAS (o Expo usa APNs diretamente para `expo-notifications`):
   ```bash
   cd repos/app
   eas credentials -p ios
   # selecione: Production → Push Notifications Key → Set up / Upload → aponte o .p8 + Key ID + Team ID
   ```

## Passo 5 — Firebase: registrar o app iOS (gera plist + iOS OAuth Client)

1. <https://console.firebase.google.com> → projeto **spartacus-artes-marciais** → **⚙ Project settings**
   → aba **General** → **Your apps** → **Add app** → **iOS**.
2. **Apple bundle ID:** `br.com.spartacus.app`. App nickname: `Spartacus iOS`. Registre.
3. **Baixe o `GoogleService-Info.plist`** e salve em **`repos/app/GoogleService-Info.plist`**
   (arquivo referenciado por `app.json` → `ios.googleServicesFile`; **commite** no repo, como já é
   feito com o `google-services.json` do Android).
4. Abra o plist e localize:
   - **`REVERSED_CLIENT_ID`** (formato `com.googleusercontent.apps.XXXXXXXX-...`)
     → cole em `app.json` no lugar de `REPLACE_WITH_REVERSED_CLIENT_ID`.
   - **`CLIENT_ID`** (formato `XXXXXXXX-....apps.googleusercontent.com`) = o **iOS OAuth Client ID**.
5. Registrar o app iOS no Firebase cria automaticamente um **OAuth client iOS** no Google Cloud.
   Confira em <https://console.cloud.google.com/apis/credentials> (projeto spartacus-artes-marciais)
   se existir um "iOS client" com esse bundle. Use o `CLIENT_ID` do passo anterior.
   → cole o iOS OAuth Client ID nos **3 lugares**: `eas.json` (env `preview` e `production`) e
   `.github/workflows/ci.yml` (passo "Publish OTA update"), no lugar de
   `REPLACE_WITH_IOS_OAUTH_CLIENT_ID.apps.googleusercontent.com`.

> **Push via FCM (opcional):** se quiser rotear push iOS pelo Firebase Cloud Messaging em vez do
> Expo Push, suba a APNs Auth Key (Passo 4) também em Firebase → Project settings → **Cloud
> Messaging** → APNs Authentication Key. Para o MVP, o Expo Push (Passo 4) já basta.

## Passo 6 — Ficha da App Store (obrigatória para submeter à revisão)

No App Store Connect, no app criado:
1. **Pricing and Availability:** preço **Free**; disponibilidade **Brasil** (ou global).
2. **App Privacy:** declare a coleta de **nome e e-mail** (via Google Sign-In / Firebase Auth) e o
   uso. Informe a **Privacy Policy URL**.
3. **Prepare for Submission** (versão 1.0.0):
   - **Screenshots** nos tamanhos exigidos (iPhone 6.9" e 6.5"). Gere num iPhone/simulador.
   - **Description**, **Keywords**, **Support URL**, **Marketing URL** (opcional).
   - **Ícone:** vem do binário (gerado do `assets/icon-ios.png` 1024×1024 — já no repo).
   - **Age Rating:** responda o questionário.

## Passo 7 — App Review Information (crítico — o app exige login)

Como o Spartacus exige autenticação, o revisor da Apple **precisa** de uma conta de teste:
1. Em **App Review Information**, forneça uma **conta demo** (e-mail + senha de um usuário já
   aprovado com papel adequado, ex. `student` ou `guardian`).
2. Em **Notes**, explique o fluxo (login via Google **ou** a conta demo) e como testar as
   funcionalidades principais (frequência/QR, etc.).

> Sem conta demo válida, a rejeição por *Guideline 2.1 (login incompleto)* é praticamente certa.

## Passo 8 — GitHub Secret

No repositório do app (**GitHub → Settings → Secrets and variables → Actions**):
- Adicione o secret **`ASC_API_KEY_P8`** com o **conteúdo integral** do arquivo `.p8` do Passo 2
  (inclua as linhas `-----BEGIN PRIVATE KEY-----` … `-----END PRIVATE KEY-----`).
- O CI materializa esse secret em `asc-api-key.p8` antes do `eas submit` (o `.p8` é gitignored).

`EXPO_TOKEN` já existe e cobre `eas build/submit/update` iOS. Não são necessários outros secrets.

## Passo 9 — Bootstrap das credenciais EAS iOS (deixa o CI 100% não-interativo)

Rode uma vez, localmente, para o EAS gerar/armazenar o **distribution certificate** e o
**provisioning profile** de App Store (usa a ASC API Key, sem 2FA):
```bash
cd repos/app
# opção A: setup guiado de credenciais
eas credentials -p ios
# opção B: primeiro build já gera tudo de forma não-interativa
eas build -p ios --profile production --non-interactive
```
Depois disso, os builds do CI reutilizam as credenciais armazenadas no serviço do EAS.

## Passo 10 — Primeiro build, upload e submissão à revisão

1. Depois de substituir **todos os placeholders** (tabela no topo) e adicionar o
   `GoogleService-Info.plist`, faça push na `main` — o job `build-mobile` do CI vai:
   `build iOS` → `eas submit` (upload ao App Store Connect) → `OTA update`.
   - Alternativamente, rode local: `eas build -p ios --profile production --submit`.
2. O build aparece em **App Store Connect → TestFlight** após ~5–30 min de processamento.
3. Na versão **1.0.0** (**Prepare for Submission**), selecione o build processado, confirme a ficha
   (Passos 6–7) e clique **Add for Review** → **Submit for Review**.

> **Nota:** `eas submit` faz o **upload** do binário; **não** clica "Submit for Review". A submissão
> à revisão é feita no App Store Connect (obrigatoriamente manual no primeiro envio, pois exige a
> ficha completa). Depois da 1ª aprovação, é possível configurar release automático das próximas.

---

## Checklist de substituição de placeholders (antes de ligar o CI)

- [ ] `eas.json` → `appleTeamId`, `ascApiKeyId`, `ascApiKeyIssuerId`
- [ ] `eas.json` → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (blocos `preview` **e** `production`)
- [ ] `.github/workflows/ci.yml` → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (passo OTA)
- [ ] `app.json` → `CFBundleURLSchemes[0]` = REVERSED_CLIENT_ID
- [ ] `repos/app/GoogleService-Info.plist` adicionado e commitado
- [ ] GitHub Secret `ASC_API_KEY_P8` criado
- [ ] APNs key subida no EAS (`eas credentials -p ios`)
- [ ] Credenciais EAS iOS bootstrapadas (Passo 9)
- [ ] Conta demo criada e informada em App Review Information

## Verificação

```bash
cd repos/app
npm run typecheck && npm run lint
# valida que o app.json iOS gera projeto nativo (requer o GoogleService-Info.plist já presente):
npx expo prebuild -p ios --clean
```
Depois, instale o build via **TestFlight** num iPhone real e valide:
- App abre (Firebase JS SDK lê as `EXPO_PUBLIC_*`).
- **Google Sign-In funciona no iOS** (iosClientId + URL scheme REVERSED_CLIENT_ID corretos).
- Push iOS: registra token e recebe notificação de teste.
