# n8n-nodes-humanhours

n8n community node for [humanhours](https://humanhours.dev). Track AI agent tasks straight from your n8n workflows; humanhours computes hours and money saved and exposes them through a dashboard and Reports API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Credential](#credential)
- [Operations](#operations)
- [Usage patterns](#usage-patterns)
- [Compatibility](#compatibility)
- [Resources](#resources)
- [Version history](#version-history)

## Installation

Once verified, install the node from your n8n instance under **Settings, Community Nodes** with the package name `n8n-nodes-humanhours`.

For local development, follow the [installation guide for community nodes](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credential

Create a `Humanhours API` credential with:

| Field | Required | Notes |
|---|---|---|
| API Key | yes | `hh_live_...`, generated at [/api-keys](https://humanhours.dev/api-keys) in your humanhours dashboard |
| Base URL | no | Defaults to `https://humanhours.dev`. Override only when running humanhours self-hosted or against a local dev instance. |

The credential's **Test connection** button calls `GET /api/v1/agents` to verify the key.

## Operations

Pick a **Resource** first: **Event** to track agent runs, or **Company** to enrich domains for outreach.

### Track Event

Send a single agent task event to humanhours.

| Field | Required | Description |
|---|---|---|
| Agent ID | yes | Slug identifying the agent that performed the task, e.g. `support-classifier` |
| Task Type | yes | One of the 50 humanhours built-in keys, or one of your custom keys |
| Outcome | yes | `Success`, `Failure`, or `Needs Review` |
| Agent Duration (seconds) | no | How long the agent took. Omit for zero. |
| Human Baseline (minutes) | no | Override the baseline for this event. Leave empty to use the built-in or org-set baseline. |
| Model | no | Model used, ideally the OpenRouter id (e.g. `anthropic/claude-opus-4.8`). With token counts, humanhours auto-prices the run into `net_saved`. |
| Tokens In / Tokens Out | no | Prompt and completion token counts for the run. Used with Model to compute the real cost. |
| Metadata | no | Free-form JSON object attached to the event. Useful for `client`, `ticket_id`, `model`, or token counts. |

The node sends an `Idempotency-Key` header derived from the n8n execution id and item index, so re-runs of the same workflow item are safe.

### Company enrichment

Under the **Company** resource, turn a domain into an outside-in labour-cost and automation business case, then pull the library for outreach.

| Operation | Calls | Notes |
|---|---|---|
| Enrich Company | `POST /api/v1/companies` | Synchronous (15 to 30 seconds). Fields: Domain, plus Refresh, External ID, Tags. Charges one lookup when the domain is new or Refresh is on. |
| Get Company | `GET /api/v1/companies/{domain}` | Reads one record from your library. Free. |
| Refresh Company | `POST /api/v1/companies/{domain}/refresh` | Re-enriches an owned company. Charges one lookup. |
| List Companies | `GET /api/v1/companies` | Return Format JSON emits one item per company; CSV emits a single `csv` field. Filter by Tag, cap with Limit. Free. |
| Queue Bulk Enrichment | `POST /api/v1/companies/bulk` | Async. Domains (one per line, max 1000) plus Tags. Returns a `job_id`; lookups are charged per domain as the worker processes them. |
| Get Job Status | `GET /api/v1/jobs/{id}` | Poll a bulk job until `status` is `done`. |

Lookups are a hard cap with no overages (Pro 100 per month, Agency 500 pooled). Hitting the limit returns `lookup_quota_exceeded` until you upgrade.

## Usage patterns

**Pattern 1, end of a single-node agent.** Drop the humanhours node at the end of an OpenAI / Claude / HTTP Request flow. Wire `Agent ID` to a workflow constant, `Task Type` to whatever the workflow does.

**Pattern 2, branch on outcome.** Use an `If` node to determine `Outcome` based on the agent's structured output, then merge both branches into a single humanhours node.

**Pattern 3, include token cost.** Wire `Metadata` to an expression like:

```
={{ {model: "claude-opus-4-7", tokens_in: $json.usage.prompt_tokens, tokens_out: $json.usage.completion_tokens} }}
```

so the dashboard can break down by model later.

## Compatibility

- Tested against n8n `1.69.0` and newer.
- Requires `n8n-workflow` (provided by the n8n host).
- No runtime dependencies.

## Resources

- [humanhours documentation](https://humanhours.dev/docs)
- [humanhours API reference](https://humanhours.dev/docs/api)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Version history

### 0.3.0

- Track Event gained `Model`, `Tokens In`, and `Tokens Out`. Pass these (without an explicit Agent Cost) and humanhours auto-prices the run cost into `net_saved` for real net ROI.

### 0.2.0

- Added a `Company` resource with six enrichment operations: Enrich Company, Get Company, Refresh Company, List Companies, Queue Bulk Enrichment, and Get Job Status.
- Grouped operations under a `Resource` selector. Existing `Track Event` workflows are unaffected.

### 0.1.0

- Initial release.
- `Track Event` operation against `POST /api/v1/track`.
- `Humanhours API` credential with API Key + Base URL, plus a credential test that calls `GET /api/v1/agents`.

## License

[MIT](LICENSE.md)
