import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

// Programmatic style is required because the Track Event operation needs an
// Idempotency-Key header derived from the n8n execution id, the upstream
// node-run index, and the item index, resolved per-item at runtime. The same
// node also drives company enrichment: turning a domain into an outside-in
// labour-cost and automation business case, and reading the library back.
export class Humanhours implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HumanHours',
		name: 'humanhours',
		icon: { light: 'file:humanhours.svg', dark: 'file:humanhours.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Track AI agent tasks and enrich company domains into a labour-cost business case',
		defaults: {
			name: 'HumanHours',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'humanhoursApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Company', value: 'company' },
					{ name: 'Event', value: 'event' },
				],
				default: 'event',
			},

			// --- Event operations ---
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['event'] } },
				options: [
					{
						name: 'Track Event',
						value: 'track',
						description: 'Send a single agent task event to humanhours',
						action: 'Track an agent task event',
					},
				],
				default: 'track',
			},

			// --- Company operations ---
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['company'] } },
				options: [
					{
						name: 'Enrich Company',
						value: 'enrichCompany',
						description: 'Research a domain into an outside-in labour-cost business case',
						action: 'Enrich a company domain',
					},
					{
						name: 'Get Company',
						value: 'getCompany',
						description: 'Read one enriched company from your library',
						action: 'Get a company',
					},
					{
						name: 'Get Job Status',
						value: 'getJob',
						description: 'Check the progress of a bulk enrichment job',
						action: 'Get a bulk job status',
					},
					{
						name: 'List Companies',
						value: 'listCompanies',
						description: 'List or export the companies in your library',
						action: 'List companies',
					},
					{
						name: 'Queue Bulk Enrichment',
						value: 'queueBulk',
						description: 'Queue a background job to enrich many domains',
						action: 'Queue a bulk enrichment job',
					},
					{
						name: 'Refresh Company',
						value: 'refreshCompany',
						description: 'Re-enrich a company you already own',
						action: 'Refresh a company',
					},
				],
				default: 'enrichCompany',
			},

			// --- Track Event fields ---
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'support-classifier',
				description: 'Slug identifying the agent that performed the task',
				displayOptions: { show: { resource: ['event'], operation: ['track'] } },
			},
			{
				displayName: 'Task Type',
				name: 'taskType',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'email_classification',
				description:
					'Slug of the task type. Use one of the humanhours built-in keys or one of your custom keys.',
				displayOptions: { show: { resource: ['event'], operation: ['track'] } },
			},
			{
				displayName: 'Outcome',
				name: 'outcome',
				type: 'options',
				required: true,
				options: [
					{ name: 'Failure', value: 'failure' },
					{ name: 'Needs Review', value: 'needs_review' },
					{ name: 'Success', value: 'success' },
				],
				default: 'success',
				displayOptions: { show: { resource: ['event'], operation: ['track'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['event'], operation: ['track'] } },
				options: [
					{
						displayName: 'Agent Duration (Seconds)',
						name: 'agentDurationSeconds',
						type: 'number',
						default: 0,
						description: 'How long the agent took. Omit to record zero seconds.',
					},
					{
						displayName: 'Human Baseline (Minutes)',
						name: 'humanBaselineMinutes',
						type: 'number',
						default: 0,
						description:
							'Override the baseline for this event. Leave empty to use the built-in or org-set baseline.',
					},
					{
						displayName: 'Metadata',
						name: 'metadata',
						type: 'json',
						default: '{}',
						description:
							'Free-form JSON object attached to the event. Useful for client, ticket_id, model or token counts.',
					},
				],
			},

			// --- Company: single-domain operations ---
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'acme.com',
				description: 'The company domain to act on',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['enrichCompany', 'getCompany', 'refreshCompany'],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'enrichOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['company'], operation: ['enrichCompany'] } },
				options: [
					{
						displayName: 'External ID',
						name: 'externalId',
						type: 'string',
						default: '',
						description: 'An ID from your own system, stored on the library entry',
					},
					{
						displayName: 'Refresh',
						name: 'refresh',
						type: 'boolean',
						default: false,
						description:
							'Whether to force a re-enrichment even when the domain is already in your library. Consumes one lookup.',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						placeholder: 'prospect, q3-list',
						description: 'Comma-separated tags to attach to the library entry',
					},
				],
			},

			// --- Company: bulk ---
			{
				displayName: 'Domains',
				name: 'domains',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				placeholder: 'acme.com\nexample.io\nmollie.nl',
				description: 'Domains to enrich, one per line or comma-separated (max 1000)',
				displayOptions: { show: { resource: ['company'], operation: ['queueBulk'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'bulkOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['company'], operation: ['queueBulk'] } },
				options: [
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						placeholder: 'prospect, q3-list',
						description: 'Comma-separated tags applied to every company the job enriches',
					},
				],
			},

			// --- Company: list / export ---
			{
				displayName: 'Return Format',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'CSV', value: 'csv' },
					{ name: 'JSON', value: 'json' },
				],
				default: 'json',
				description: 'JSON emits one item per company; CSV emits a single item with a "csv" field',
				displayOptions: { show: { resource: ['company'], operation: ['listCompanies'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'listOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['company'], operation: ['listCompanies'] } },
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 50,
						description: 'Max number of results to return',
					},
					{
						displayName: 'Tag',
						name: 'tag',
						type: 'string',
						default: '',
						description: 'Only return companies that carry this tag',
					},
				],
			},

			// --- Company: job status ---
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				default: '',
				required: true,
				description: 'The bulk job ID returned by Queue Bulk Enrichment',
				displayOptions: { show: { resource: ['company'], operation: ['getJob'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('humanhoursApi');
		const baseUrl = String(credentials.baseUrl ?? 'https://humanhours.dev').replace(/\/$/, '');

		const request = async (options: IHttpRequestOptions) =>
			this.helpers.httpRequestWithAuthentication.call(this, 'humanhoursApi', options);

		const parseList = (raw: string): string[] =>
			raw
				.split(/[\n,]+/)
				.map((entry) => entry.trim())
				.filter((entry) => entry.length > 0);

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i, 'track') as string;

				if (operation === 'track') {
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
						agentDurationSeconds?: number;
						humanBaselineMinutes?: number;
						metadata?: string | Record<string, unknown>;
					};

					const body: IDataObject = {
						agent_id: this.getNodeParameter('agentId', i) as string,
						task_type: this.getNodeParameter('taskType', i) as string,
						outcome: this.getNodeParameter('outcome', i) as string,
					};

					if (
						typeof additionalFields.agentDurationSeconds === 'number' &&
						additionalFields.agentDurationSeconds > 0
					) {
						body.agent_duration_seconds = additionalFields.agentDurationSeconds;
					}

					if (
						typeof additionalFields.humanBaselineMinutes === 'number' &&
						additionalFields.humanBaselineMinutes > 0
					) {
						body.human_baseline_minutes = additionalFields.humanBaselineMinutes;
					}

					if (additionalFields.metadata !== undefined && additionalFields.metadata !== null) {
						let metadata: unknown = additionalFields.metadata;
						if (typeof metadata === 'string') {
							const trimmed = metadata.trim();
							if (trimmed.length === 0) {
								metadata = {};
							} else {
								try {
									metadata = JSON.parse(trimmed);
								} catch (err) {
									throw new NodeOperationError(
										this.getNode(),
										`Metadata is not valid JSON: ${(err as Error).message}`,
										{ itemIndex: i },
									);
								}
							}
						}
						if (
							metadata &&
							typeof metadata === 'object' &&
							!Array.isArray(metadata) &&
							Object.keys(metadata as Record<string, unknown>).length > 0
						) {
							body.metadata = metadata as IDataObject;
						}
					}

					const sourceData = this.getInputSourceData();
					const runIndex = sourceData?.previousNodeRun ?? 0;
					const response = await request({
						method: 'POST',
						url: `${baseUrl}/api/v1/track`,
						body,
						json: true,
						headers: {
							'Idempotency-Key': `${this.getExecutionId()}:${runIndex}:${i.toString().padStart(4, '0')}`,
						},
					});
					returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
					continue;
				}

				if (operation === 'enrichCompany') {
					const domain = this.getNodeParameter('domain', i) as string;
					const extra = this.getNodeParameter('enrichOptions', i, {}) as {
						externalId?: string;
						refresh?: boolean;
						tags?: string;
					};
					const body: IDataObject = { domain };
					if (extra.externalId && extra.externalId.trim().length > 0) {
						body.external_id = extra.externalId.trim();
					}
					const tags = parseList(extra.tags ?? '');
					if (tags.length > 0) body.tags = tags;
					const response = await request({
						method: 'POST',
						url: `${baseUrl}/api/v1/companies`,
						qs: extra.refresh ? { refresh: 'true' } : undefined,
						body,
						json: true,
					});
					returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
					continue;
				}

				if (operation === 'getCompany') {
					const domain = this.getNodeParameter('domain', i) as string;
					const response = await request({
						method: 'GET',
						url: `${baseUrl}/api/v1/companies/${encodeURIComponent(domain)}`,
						json: true,
					});
					returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
					continue;
				}

				if (operation === 'refreshCompany') {
					const domain = this.getNodeParameter('domain', i) as string;
					const response = await request({
						method: 'POST',
						url: `${baseUrl}/api/v1/companies/${encodeURIComponent(domain)}/refresh`,
						json: true,
					});
					returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
					continue;
				}

				if (operation === 'listCompanies') {
					const format = this.getNodeParameter('format', i, 'json') as string;
					const extra = this.getNodeParameter('listOptions', i, {}) as {
						limit?: number;
						tag?: string;
					};
					const qs: IDataObject = { format };
					if (typeof extra.limit === 'number' && extra.limit > 0) qs.limit = extra.limit;
					if (extra.tag && extra.tag.trim().length > 0) qs.tag = extra.tag.trim();
					const response = await request({
						method: 'GET',
						url: `${baseUrl}/api/v1/companies`,
						qs,
						json: format === 'json',
					});
					if (format === 'csv') {
						returnData.push({ json: { csv: String(response) }, pairedItem: { item: i } });
					} else {
						const companies = ((response as { companies?: IDataObject[] }).companies ??
							[]) as IDataObject[];
						for (const company of companies) {
							returnData.push({ json: company, pairedItem: { item: i } });
						}
					}
					continue;
				}

				if (operation === 'queueBulk') {
					const domains = parseList(this.getNodeParameter('domains', i) as string);
					if (domains.length === 0) {
						throw new NodeOperationError(this.getNode(), 'Provide at least one domain.', {
							itemIndex: i,
						});
					}
					const extra = this.getNodeParameter('bulkOptions', i, {}) as { tags?: string };
					const body: IDataObject = { domains };
					const tags = parseList(extra.tags ?? '');
					if (tags.length > 0) body.tags = tags;
					const response = await request({
						method: 'POST',
						url: `${baseUrl}/api/v1/companies/bulk`,
						body,
						json: true,
					});
					returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
					continue;
				}

				if (operation === 'getJob') {
					const jobId = this.getNodeParameter('jobId', i) as string;
					const response = await request({
						method: 'GET',
						url: `${baseUrl}/api/v1/jobs/${encodeURIComponent(jobId)}`,
						json: true,
					});
					returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
					continue;
				}

				throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
					itemIndex: i,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
