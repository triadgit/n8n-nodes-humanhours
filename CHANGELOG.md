# Changelog

All notable changes to `n8n-nodes-humanhours` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-06

### Added

- `humanhours` node with the `Track Event` operation, posting to `POST /api/v1/track`.
- `Humanhours API` credential with `apiKey` and `baseUrl` properties, plus a credential test against `GET /api/v1/agents`.
- Idempotency-Key header derived from the n8n execution id plus item index, so re-runs of the same workflow item are safe.

[0.1.0]: https://github.com/triadgit/n8n-nodes-humanhours/releases/tag/0.1.0
