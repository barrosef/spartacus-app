# ADR-00: Variáveis de Ambiente

**Status:** Aceita
**Data:** 2026-03-09
**Contexto:** Migração do monorepo para repositório standalone `spartacus-app`

## Decisão

Todas as variáveis de ambiente do app mobile são gerenciadas via arquivo `.env` na raiz do repositório, seguindo a convenção do Expo (`EXPO_PUBLIC_` prefix para variáveis acessíveis no client-side).

O arquivo `.env` **não é commitado** (listado no `.gitignore`). Este ADR serve como documentação canônica das variáveis esperadas.

## Variáveis

### Firebase (obrigatório — app não inicia sem)

| Variável | Descrição | Onde obter |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | API key do projeto Firebase | Firebase Console → Project Settings → Your apps → Config |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Domínio de autenticação | Mesmo local. Formato: `<project-id>.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | ID do projeto GCP/Firebase | Mesmo local. Valor produção: `spartacus-artes-marciais` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket do Firebase Storage | Mesmo local. Formato: `<project-id>.appspot.com` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID do Cloud Messaging | Mesmo local (campo `messagingSenderId`) |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | App ID do Firebase | Mesmo local (campo `appId`) |

**Uso no código:** `src/lib/firebase.ts` — objeto `firebaseConfig` passado a `initializeApp()`.

### Google OAuth (obrigatório para login social)

| Variável | Descrição | Onde obter |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Client ID OAuth 2.0 tipo **Web** | GCP Console → APIs & Services → Credentials → OAuth 2.0 Client IDs |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Client ID OAuth 2.0 tipo **Android** | Mesmo local. Deve ter o SHA-1 do keystore configurado |

**Uso no código:** `src/lib/googleAuth.ts` — passados a `Google.useAuthRequest()`.

## Template `.env`

```env
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=spartacus-artes-marciais.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=spartacus-artes-marciais
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=spartacus-artes-marciais.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

## Notas

- O Expo só injeta variáveis com prefixo `EXPO_PUBLIC_` no bundle client-side.
- Alterações no `.env` exigem restart do bundler (`expo start`).
- Para emuladores locais, não são necessárias credenciais reais — o Firebase Auth Emulator aceita qualquer config.
