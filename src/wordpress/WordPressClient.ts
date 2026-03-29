// SCRIPT: src/wordpress/WordPressClient.ts
// DESCRIÇÃO: Wrapper HTTP para a REST API do WordPress.
//            Auth via Application Password (Basic Auth) ou Bearer token (WordPress.com).
//            Usa requestUrl do Obsidian (sem dependências externas).
// CHAMADO POR: src/wordpress/WordPressAdapter.ts
// CONTRATO: Exporta WordPressClient com getMe(), createPost()

import { requestUrl } from "obsidian";

export interface WordPressUser {
	id: number;
	name: string;
	email: string;
	link: string;
}

export interface WordPressPostResponse {
	id: number;
	link: string;
	status: string;
	title: { rendered: string };
}

export class WordPressClient {
	private readonly url: string;
	private readonly username: string;
	private readonly appPassword: string;

	constructor(url: string, username: string, appPassword: string) {
		this.url = this.normalizeUrl(url);
		this.username = username.trim();
		this.appPassword = appPassword.trim();
	}

	async getMe(): Promise<WordPressUser | null> {
		return this.request<WordPressUser>("GET", "/wp/v2/users/me");
	}

	async createPost(data: {
		title: string;
		content: string;
		status: "publish" | "draft";
		excerpt?: string;
		tags?: number[];
	}): Promise<WordPressPostResponse | null> {
		return this.request<WordPressPostResponse>("POST", "/wp/v2/posts", data);
	}

	// ── Private ──────────────────────────────────────────────────────────────

	private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T | null> {
		const { url, headers } = this.buildRequestConfig(endpoint);

		const response = await requestUrl({
			url,
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
			throw: false,
		});

		if (response.status >= 400) return null;

		try {
			return JSON.parse(response.text) as T;
		} catch {
			return null;
		}
	}

	private buildRequestConfig(endpoint: string): { url: string; headers: Record<string, string> } {
		const isBearer = !this.username ||
			["token", "bearer"].includes(this.username.toLowerCase()) ||
			this.url.includes(".wordpress.com");

		let url: string;
		if (isBearer && this.url.includes(".wordpress.com")) {
			const domain = this.url.replace(/^https?:\/\//, "").split("/")[0];
			const clean = endpoint.startsWith("/wp/v2") ? endpoint.replace("/wp/v2", "") : endpoint;
			url = `https://public-api.wordpress.com/wp/v2/sites/${domain}${clean}`;
		} else {
			url = `${this.url}/wp-json${endpoint}`;
		}

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: isBearer
				? `Bearer ${this.appPassword}`
				: `Basic ${btoa(`${this.username}:${this.appPassword}`)}`,
		};

		return { url, headers };
	}

	private normalizeUrl(url: string): string {
		let u = url.trim().replace(/\/$/, "");
		if (!u.startsWith("http")) u = `https://${u}`;
		return u;
	}
}
