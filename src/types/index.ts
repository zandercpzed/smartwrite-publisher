// SCRIPT: src/types/index.ts
// DESCRIÇÃO: Contratos TypeScript do SmartWrite Publisher.
//            Define settings, tipos de publicação e interfaces de plataforma.
// CHAMADO POR: Todos os módulos do Publisher
// CONTRATO: Exporta interfaces e tipos sem dependências de runtime

// ── Settings ───────────────────────────────────────────────────────────────

export interface PublisherSettings {
	/** Credenciais das plataformas (gerenciadas pelo Orchestrator) */
	substackCookie: string;
	substackUrl: string;
	wordpressUrl: string;
	wordpressUsername: string;
	wordpressAppPassword: string;
}

export const DEFAULT_SETTINGS: PublisherSettings = {
	substackCookie: "",
	substackUrl: "",
	wordpressUrl: "",
	wordpressUsername: "",
	wordpressAppPassword: "",
};

// ── Post / Frontmatter ─────────────────────────────────────────────────────

/**
 * Metadados extraídos do frontmatter da nota Obsidian.
 * Estes campos funcionam como o "cockpit de publicação".
 */
export interface PostMeta {
	title: string;
	subtitle?: string;
	tags?: string[];
	/** "draft" | "published" | "scheduled" */
	status: "draft" | "published";
	/** Plataformas alvo: "substack" | "wordpress" */
	platforms?: Platform[];
}

// ── Plataformas ────────────────────────────────────────────────────────────

export type Platform = "substack" | "wordpress";

export interface PublishTarget {
	platform: Platform;
	/** Rascunho ou publicado direto */
	asDraft: boolean;
}

export interface PublishResult {
	platform: Platform;
	success: boolean;
	url?: string;
	error?: string;
}

// ── Adapter Interface ──────────────────────────────────────────────────────

/**
 * Interface que toda plataforma de publicação deve implementar.
 */
export interface PlatformAdapter {
	readonly name: string;
	isConfigured(): boolean;
	testConnection(): Promise<{ success: boolean; error?: string }>;
	publish(title: string, htmlContent: string, meta: PostMeta, asDraft: boolean): Promise<PublishResult>;
}
