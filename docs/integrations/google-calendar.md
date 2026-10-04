# Google Calendar

Read-only access to the broker's events, connected from `/integrations` (ADR 0008).

## Google Cloud setup (project `imobos-510600`)

1. Enable the **Google Calendar API**.
2. Google Auth Platform → **Data Access**: add `.../auth/calendar.events.readonly` (sensitive).
3. **Clients** → Web application **"ImobOS integrações"**, redirect URIs exactly:
   `https://corretora.v1cferr.dev/api/integrations/google-calendar/callback` and
   `http://localhost:3000/api/integrations/google-calendar/callback`.
4. Its id and secret go to `GOOGLE_INTEGRATIONS_CLIENT_ID` / `GOOGLE_INTEGRATIONS_CLIENT_SECRET`
   on the host (password manager item "ImobOS Google OAuth (integrações)").

Until Google verifies the app, the consent screen shows "Google hasn't verified this app": the
broker continues through *Advanced → Go to ImobOS*.

## Flow

`Conectar` → Google consent (`openid email calendar.events.readonly`, offline, PKCE) → callback
checks session + state → the api exchanges the code, keeps the tokens encrypted and shows the
connected account. `Verificar` refreshes if needed and reads at most one event id; nothing from the
calendar is stored. `Desconectar` revokes at Google, then deletes the tokens.

## Errors shown

`scope_not_granted` (calendar unticked on the consent screen), `invalid_grant` (authorization
refused or expired), `http_401` / `http_403` (grant revoked in the Google account): the screen asks
to disconnect and connect again.
