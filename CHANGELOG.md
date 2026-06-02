# Changelog

All notable changes to `n8n-nodes-humanhours` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-06-02

### Fixed

- Codex `categories` dropped the unsupported `Developer Tools` value (n8n Cloud verification blocker). The node now lists `Development`, `Analytics`, and `Sales`.

## [0.2.0] - 2026-05-31

### Added

- Company enrichment operations under a new `Company` resource: `Enrich Company` (`POST /api/v1/companies`, synchronous), `Get Company`, `Refresh Company`, `List Companies` (JSON one item per company, or CSV), `Queue Bulk Enrichment` (`POST /api/v1/companies/bulk`, async job), and `Get Job Status`. Turn a domain into an outside-in labour-cost and automation business case, then pull the library for outreach.

### Changed

- Operations are now grouped under a `Resource` selector (`Event` for Track Event, `Company` for enrichment). Existing `Track Event` workflows keep working: the default resource is `Event` and the operation value is unchanged.

## [0.1.4] - 2026-05-08

### Fixed

- Idempotency-Key now includes the node-run index, so workflows that fan into the HumanHours node multiple times within a single execution (loops, Split-In-Batches, sub-workflows, branch fan-in) record one event per run instead of collapsing into one. Before this fix, the second and subsequent runs of the node within the same execution returned the existing event from the first run, silently undercounting events.

## [0.1.3] - 2026-05-06

### Changed

- Copy: "hours and euros saved" → "hours and money saved" everywhere (node description, package description, README). HumanHours' API exposes `currency` per org and defaults to EUR but is not euro-only.

## [0.1.2] - 2026-05-06

### Added

- Separate light- and dark-mode icons for both the node and the credential. n8n switches automatically based on the user's UI theme; the dark-mode SVG is the white-on-green variant, the light-mode SVG is the original black-on-green.

## [0.1.1] - 2026-05-06

### Changed

- Renamed node display from `humanhours` to `HumanHours` (matches the brand styling). Internal node and credential identifiers (`humanhours`, `humanhoursApi`) are unchanged, so existing workflows keep working.
- Renamed credential display from `Humanhours API` to `HumanHours API`.
- Icon switched from black-on-green to white-on-green.

## [0.1.0] - 2026-05-06

### Added

- `humanhours` node with the `Track Event` operation, posting to `POST /api/v1/track`.
- `Humanhours API` credential with `apiKey` and `baseUrl` properties, plus a credential test against `GET /api/v1/agents`.
- Idempotency-Key header derived from the n8n execution id plus item index, so re-runs of the same workflow item are safe.

[0.2.1]: https://github.com/triadgit/n8n-nodes-humanhours/releases/tag/0.2.1
[0.2.0]: https://github.com/triadgit/n8n-nodes-humanhours/releases/tag/0.2.0
[0.1.4]: https://github.com/triadgit/n8n-nodes-humanhours/releases/tag/0.1.4
[0.1.3]: https://github.com/triadgit/n8n-nodes-humanhours/releases/tag/0.1.3
[0.1.2]: https://github.com/triadgit/n8n-nodes-humanhours/releases/tag/0.1.2
[0.1.1]: https://github.com/triadgit/n8n-nodes-humanhours/releases/tag/0.1.1
[0.1.0]: https://github.com/triadgit/n8n-nodes-humanhours/releases/tag/0.1.0
