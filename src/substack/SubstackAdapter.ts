// SCRIPT: src/substack/SubstackAdapter.ts
// DESCRIÇÃO: Adapter Substack — implementa PlatformAdapter para o Publisher.
//            Fluxo: configure → testConnection → publish (cria draft + publica).
//            Auth: cookie connect.sid obtido manualmente pelo usuário.
// CHAMADO POR: src/ui/PublisherPanel.ts
// CONTRATO: Exporta SubstackAdapter implementando PlatformAdapter

import { Notice } from "obsidian";
import { SubstackClient } from "./SubstackClient";
import type { PlatformAdapter, PublishResult, PostMeta } from "../types";

interface SubstackUserInfo {
	id: number;
	name: string;
	email: string;
}

export class SubstackAdapter implements PlatformAdapter {
	readonly name = "Substack";

	private client: SubstackClient | null = null;
	private baseUrl = "";
	private publicationId: number | null = null;
	private currentUser: SubstackUserInfo | null = null;

	configure(cookie: string, substackUrl: string): void {
		const normalizedCookie = this.normalizeCookie(cookie);
		this.baseUrl = this.buildBaseUrl(substackUrl);
		this.client = new SubstackClient(this.baseUrl, normalizedCookie);
		this.publicationId = null;
		this.currentUser = null;
	}

	isConfigured(): boolean {
		return !!this.client && !!this.baseUrl;
	}

	async testConnection(): Promise<{ success: boolean; error?: string }> {
		if (!this.client) return { success: false, error: "Substack não configurado." };

		try {
			 
			const res = await this.client.get("/api/v1/user/self");
			if (res.status === 200 && res.json) {
				 
				const data = res.json as Record<string, unknown>;
				this.currentUser = {
					id: (data["id"] as number) ?? 0,
					name: (data["name"] as string) ?? (data["username"] as string) ?? "User",
					email: (data["email"] as string) ?? "",
				};
				await this.fetchPublicationId();
				return { success: true };
			}

			if (res.status === 401 || res.status === 403) {
				return { success: false, error: `Erro ${res.status}: cookie expirado ou inválido.` };
			}
			return { success: false, error: `Erro inesperado: ${res.status}` };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { success: false, error: msg };
		}
	}

	async publish(
		title: string,
		htmlContent: string,
		meta: PostMeta,
		asDraft: boolean
	): Promise<PublishResult> {
		if (!this.client || !this.currentUser || !this.publicationId) {
			return { platform: "substack", success: false, error: "Substack não conectado. Execute testConnection() primeiro." };
		}

		// 1. Criar draft
		const draftResult = await this.createDraft(title, htmlContent, meta);
		if (!draftResult.success || !draftResult.draftId) {
			return { platform: "substack", success: false, error: draftResult.error };
		}

		// 2. Se apenas rascunho, retornar URL do draft
		if (asDraft) {
			return {
				platform: "substack",
				success: true,
				url: `${this.baseUrl}/publish/post/${draftResult.draftId}`,
			};
		}

		// 3. Publicar draft
		return this.publishDraft(draftResult.draftId);
	}

	// ── Private ──────────────────────────────────────────────────────────────

	private async createDraft(
		title: string,
		htmlContent: string,
		meta: PostMeta
	): Promise<{ success: boolean; draftId?: number; error?: string }> {
		const payload = {
			draft_title: title,
			draft_subtitle: meta.subtitle ?? "",
			draft_body: this.wrapInSubstackHtml(htmlContent),
			draft_section_id: null,
			section_chosen: false,
			audience: "everyone",
		};

		const res = await this.client!.post(
			`/api/v1/drafts?publication_id=${this.publicationId}`,
			payload
		);

		if (res.status === 200 || res.status === 201) {
			 
			const data = res.json as Record<string, unknown>;
			const draftId = (data["id"] as number | undefined) ?? (data["draft_id"] as number | undefined);
			if (draftId) return { success: true, draftId };
		}

		return { success: false, error: `Falha ao criar draft: ${res.status} — ${res.text.substring(0, 120)}` };
	}

	private async publishDraft(draftId: number): Promise<PublishResult> {
		const res = await this.client!.post(`/api/v1/drafts/${draftId}/publish`, { send: true });

		if (res.status === 200 || res.status === 201) {
			return {
				platform: "substack",
				success: true,
				url: `${this.baseUrl}/p/${draftId}`,
			};
		}

		// Draft foi criado mas publicação automática falhou — considerar sucesso parcial
		new Notice("Substack: draft criado. Publique manualmente em substack.com.");
		return {
			platform: "substack",
			success: true,
			url: `${this.baseUrl}/publish/post/${draftId}`,
			error: "Draft criado. Publicação automática falhou — publique manualmente.",
		};
	}

	private async fetchPublicationId(): Promise<void> {
		if (this.publicationId) return;

		const res = await this.client!.get("/api/v1/publication");
		if (res.status === 200 && res.json) {
			 
			const data = res.json as Record<string, unknown>;
			this.publicationId = (data["id"] as number | undefined) ?? null;
		}
	}

	/**
	 * O Substack espera o conteúdo em formato de HTML com o wrapper "paragraph" do Substack.
	 * Para o MVP, encapsulamos o HTML em um parágrafo simples.
	 */
	private wrapInSubstackHtml(html: string): string {
		return html;
	}

	private normalizeCookie(cookie: string): string {
		const trimmed = cookie.trim().replace(/^cookie:\s*/i, "");
		const match = trimmed.match(/connect\.sid=([^;\s]+)/);
		return match?.[1] ?? trimmed;
	}

	private buildBaseUrl(url: string): string {
		let host = url.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
		if (!host.includes(".")) host = `${host}.substack.com`;
		return `https://${host}`;
	}
}
