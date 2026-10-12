# Security

- The FableGear service is reachable only over the Tailscale tailnet and binds
  to its Tailscale interface, not a public network interface.
- The app stores the service token in iOS Keychain / Android Keystore through
  `expo-secure-store`. Never commit credentials, display them after entry, or
  log request headers or token values.
- Every service request is authenticated. Reachability checks use the same
  authenticated transport.
- When the service is unreachable, FableGO can show a cached, read-only
  library. It does not queue writes or jobs offline.
- Deletion and USB overwrite require explicit confirmation and a dry-run
  preview. A preview must not mutate database or files.
- Purchase links and order references are sent only to the paired FableGear
  service. FableGO has no store scraping, store login, analytics, user
  accounts, or cloud backend.

Pair only with a trusted machine on the user's tailnet. The service should
validate the token on every route and reject requests from outside the
tailnet.
