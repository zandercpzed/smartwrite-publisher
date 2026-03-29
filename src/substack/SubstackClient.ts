// SCRIPT: src/substack/SubstackClient.ts
// DESCRIÇÃO: Wrapper HTTP para a API privada do Substack.
//            Usa requestUrl do Obsidian (sem dependências externas).
//            Auth via cookie connect.sid.
// CHAMADO POR: src/substack/SubstackAdapter.ts
// CONTRATO: Exporta SubstackClient com get() e post()

import { requestUrl } from "obsidian";

export interface HttpResponse {
	status: number;
	text: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	json: any;
}

export class SubstackClient {
	private readonly baseUrl: string;
	private readonly cookie: string;

	constructor(baseUrl: string, cookie: string) {
		this.baseUrl = baseUrl;
		this.cookie = cookie;
	}

	async get(endpoint: string): Promise<HttpResponse> {
		return this.request("GET", endpoint, undefined);
	}

	 
	async post(endpoint: string, body: unknown): Promise<HttpResponse> {
		return this.request("POST", endpoint, body);
	}

	private async request(method: string, endpoint: string, body: unknown): Promise<HttpResponse> {
		const url = `${this.baseUrl}${endpoint}`;

		const response = await requestUrl({
			url,
			method,
			headers: this.buildHeaders(),
			body: body !== undefined ? JSON.stringify(body) : undefined,
			throw: false,
		});

		return {
			status: response.status,
			text: response.text,
			json: this.parseJson(response.text),
		};
	}

	private buildHeaders(): Record<string, string> {
		return {
			Cookie: `connect.sid=${this.cookie}`,
			"Content-Type": "application/json",
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			Accept: "*/*",
			"Accept-Language": "en-US,en;q=0.9",
			"X-Requested-With": "XMLHttpRequest",
			"Cache-Control": "no-cache",
			Origin: this.baseUrl,
			Referer: `${this.baseUrl}/`,
		};
	}

	private parseJson(text: string): unknown {
		try { return JSON.parse(text); }
		catch { return null; }
	}
}
