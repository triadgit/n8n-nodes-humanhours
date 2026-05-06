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

// Programmatic style is required because each event needs an Idempotency-Key
// header derived from the n8n execution id plus the item index, which is
// resolved per-item at runtime. Declarative routing cannot express that.
export class Humanhours implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'humanhours',
		name: 'humanhours',
		icon: 'file:humanhours.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Track AI agent tasks; humanhours computes hours and euros saved.',
		defaults: {
			name: 'humanhours',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
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
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'support-classifier',
				description: 'Slug identifying the agent that performed the task',
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
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('humanhoursApi');
		const baseUrl = String(credentials.baseUrl ?? 'https://humanhours.dev').replace(/\/$/, '');

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i, 'track') as string;
				if (operation !== 'track') {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				}

				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
					agentDurationSeconds?: number;
					humanBaselineMinutes?: number;
					metadata?: string | Record<string, unknown>;
				};

				const body: Record<string, unknown> = {
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
						body.metadata = metadata;
					}
				}

				const requestOptions: IHttpRequestOptions = {
					method: 'POST',
					url: `${baseUrl}/api/v1/track`,
					body,
					json: true,
					headers: {
						'Idempotency-Key': `${this.getExecutionId()}:${i.toString().padStart(4, '0')}`,
					},
				};

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'humanhoursApi',
					requestOptions,
				);

				returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
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
