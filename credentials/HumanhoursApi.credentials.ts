import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HumanhoursApi implements ICredentialType {
	name = 'humanhoursApi';

	displayName = 'HumanHours API';

	icon: Icon = { light: 'file:icons/humanhours.svg', dark: 'file:icons/humanhours.dark.svg' };

	documentationUrl = 'https://humanhours.dev/docs/sdks/n8n';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your humanhours API key (looks like hh_live_...).',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://humanhours.dev',
			description: 'Override only when running humanhours self-hosted or against a local dev instance.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/agents',
			method: 'GET',
		},
	};
}
