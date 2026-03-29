// SCRIPT: src/wordpress/WordPressAdapter.ts
// DESCRIÇÃO: Adapter WordPress — implementa PlatformAdapter para o Publisher.
//            Auth via Application Password (username + app password gerado no WP Admin).
// CHAMADO POR: src/ui/PublisherPanel.ts
// CONTRATO: Exporta WordPressAdapter implementando PlatformAdapter

import { WordPressClient } from "./WordPressClient";
import type { PlatformAdapter, PublishResult, PostMeta } from "../types";

export class WordPressAdapter implements PlatformAdapter {
	readonly name = "WordPress";

	private client: WordPressClient | null = null;

	configure(url: string, username: string, appPassword: string): void {
		this.client = new WordPressClient(url, username, appPassword);
	}

	isConfigured(): boolean {
		return !!this.client;
	}

	async testConnection(): Promise<{ success: boolean; error?: string }> {
		if (!this.client) return { success: false, error: "WordPress não configurado." };

		const user = await this.client.getMe();
		if (user) return { success: true };
		return { success: false, error: "Falha na autenticação. Verifique URL, usuário e Application Password." };
	}

	async publish(
		title: string,
		htmlContent: string,
		meta: PostMeta,
		asDraft: boolean
	): Promise<PublishResult> {
		if (!this.client) {
			return { platform: "wordpress", success: false, error: "WordPress não configurado." };
		}

		const post = await this.client.createPost({
			title,
			content: htmlContent,
			status: asDraft ? "draft" : "publish",
			excerpt: meta.subtitle,
		});

		if (post) {
			return {
				platform: "wordpress",
				success: true,
				url: post.link,
			};
		}

		return {
			platform: "wordpress",
			success: false,
			error: "Falha ao criar post no WordPress. Verifique as credenciais.",
		};
	}
}
