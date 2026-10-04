# WhatsApp, Instagram, Facebook and Gmail: Chatwoot channels

V1C-83 makes Chatwoot the owner of conversations. These channels are connected **in Chatwoot**, with
the providers' official flows; ImobOS never stores their tokens and reads conversations from
Chatwoot's API instead. Owning a channel in two places would duplicate messages and consent.

| Channel | How it connects | Notes |
| --- | --- | --- |
| WhatsApp Business | Chatwoot inbox on the **WhatsApp Cloud API** (Meta) | Never WhatsApp Web automation. Evaluate Meta **Embedded Signup** for onboarding and **Coexistence** to keep the number already in the WhatsApp Business app. Message templates need Meta approval. |
| Instagram | Chatwoot Instagram inbox (Meta login) | Requires a professional/business account linked to a Facebook page. |
| Facebook / Messenger | Chatwoot Facebook inbox (Meta login) | Same Meta app as Instagram. |
| Gmail | Chatwoot e-mail inbox (Google OAuth in Chatwoot) | Only if e-mail becomes a conversation channel; a direct Gmail API in ImobOS only if a feature needs it. |

Chatwoot itself is deployed (V1C-94, [ADR 0009](../adr/0009-chatwoot-self-hosted.md),
[runbook](../operations/chatwoot.md)). Each inbox is connected with the broker present.
