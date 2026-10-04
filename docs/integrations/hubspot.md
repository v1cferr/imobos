# HubSpot (on hold)

The broker's HubSpot account belongs to the construtora. A HubSpot OAuth app is installed by a
**Super Admin** of the account and then sees the **whole account** for its scopes, every broker's
contacts and deals, not only hers. So the integration needs the construtora's authorization and may
be refused, including for LGPD reasons.

Current platform, for when it is unblocked: authorize at `https://app.hubspot.com/oauth/authorize`,
exchange and refresh at `https://api.hubapi.com/oauth/v3/token` (access tokens last 30 minutes),
read-only CRM scopes (`crm.objects.contacts.read`, `crm.objects.deals.read`, tasks). The connections
model already reserves the `hubspot` provider.

Options under discussion with the owner (V1C-85): the construtora installs the app with read-only
scopes; the broker uses a HubSpot of her own; or ImobOS becomes her personal CRM, fed by lead
e-mails, WhatsApp and quick manual entries. Any of them changes V1C-83 only after a decision.
