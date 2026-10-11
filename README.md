# FableGO

FableGO is an Expo app for managing FableGear playlists remotely over a
Tailscale tailnet. The phone is a remote control; the computer running
FableGear does the work.

## Record Room and Chop Shop

FableGO talks to the FableGear service, not to the computer's files. **Record
Room** owns metadata: library queries, tags, playlists, and imports into the
database. **Chop Shop** owns file operations: download destinations, file
moves, and USB exports. Record Room endpoints never expose file paths or
perform file operations; file work is submitted and tracked as Chop Shop jobs.
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

The app includes a local mock API so the screens and jobs can be exercised
without a FableGear service. To start it from a fresh clone:

```sh
npm install
npx expo start
```

Mock mode is enabled by default. The Library, Playlists, Jobs, and Settings
tabs use a dark Signal Cyan theme. In mock mode, playlists are editable and a
USB export advances through queued, running, and done. Set
`EXPO_PUBLIC_USE_MOCK_API=false` to use a configured FableGear service.

## Development

```sh
npm run lint
npm run typecheck
npm test -- --runInBand
npm run api:generate
```

The API contract is in [api/openapi.yaml](api/openapi.yaml); service-side
implementation requirements are in [docs/FABLEGEAR_SERVICE.md](docs/FABLEGEAR_SERVICE.md).
Security requirements and limitations are in [docs/SECURITY.md](docs/SECURITY.md).

## License

Placeholder: licensing terms have not yet been selected. See [LICENSE](LICENSE).
