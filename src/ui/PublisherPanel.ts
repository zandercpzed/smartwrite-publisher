// SCRIPT: src/ui/PublisherPanel.ts
// DESCRIÇÃO: Painel principal do SmartWrite Publisher na sidebar do Orchestrator.
//            Exibe a nota ativa, status de conexão e botões de publicação.
// CHAMADO POR: src/main.ts (registerView)
// CONTRATO: Exporta PublisherPanel (ItemView) e PUBLISHER_VIEW_TYPE

import { ItemView, WorkspaceLeaf, TFile, setIcon } from "obsidian";
import type SmartWritePublisher from "../main";
import type { PostMeta } from "../types";
import { SubstackAdapter } from "../substack/SubstackAdapter";
import { WordPressAdapter } from "../wordpress/WordPressAdapter";

export const PUBLISHER_VIEW_TYPE = "smartwrite-publisher";

export class PublisherPanel extends ItemView {
	private plugin: SmartWritePublisher;
	private activeFile: TFile | null = null;
	private readonly substack = new SubstackAdapter();
	private readonly wordpress = new WordPressAdapter();

	constructor(leaf: WorkspaceLeaf, plugin: SmartWritePublisher) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string { return PUBLISHER_VIEW_TYPE; }

	// eslint-disable-next-line obsidianmd/ui/sentence-case
	getDisplayText(): string { return "SmartWrite publisher"; }

	getIcon(): string { return "send"; }

	async onOpen() {
		this.activeFile = this.app.workspace.getActiveFile();
		this.configureAdapters();
		this.render();
	}

	async onClose() {}

	// ── Public API ────────────────────────────────────────────────────────

	onNoteChanged(file: TFile | null) {
		this.activeFile = file;
		this.render();
	}

	async publishNote(file: TFile) {
		this.activeFile = file;
		this.render();
		// TODO: Implementar fluxo de publicação (Fase 2)
	}

	// ── Render ───────────────────────────────────────────────────────────

	private render() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("sw-publisher");

		if (!this.activeFile) {
			this.renderEmptyState(container);
			return;
		}

		const meta = this.extractMeta();
		this.renderNoteCard(container, meta);
		this.renderPlatformSection(container, "substack", "Substack");
		this.renderPlatformSection(container, "wordpress", "WordPress");
		this.renderActions(container, meta);
	}

	private renderEmptyState(container: HTMLElement) {
		const prompt = container.createDiv("sw-publisher-auth-prompt");
		setIcon(prompt.createDiv(), "file-text");
		prompt.createEl("p", { text: "Abra uma nota para publicar." });
	}

	private renderNoteCard(container: HTMLElement, meta: PostMeta) {
		const card = container.createDiv("sw-publisher-note-card");
		card.createEl("h4", { text: meta.title });
		const metaLine = card.createDiv("sw-publisher-note-meta");
		metaLine.setText(
			[
				meta.status === "draft" ? "Rascunho" : "Publicado",
				meta.tags?.join(", "),
			]
				.filter(Boolean)
				.join(" · ")
		);
	}

	private renderPlatformSection(container: HTMLElement, platformId: string, label: string) {
		const section = container.createDiv("sw-publisher-platform");
		const header = section.createDiv("sw-publisher-platform-header");

		const isConfigured = this.isPlatformConfigured(platformId);
		const dot = header.createDiv("sw-status-dot");
		dot.addClass(isConfigured ? "connected" : "disconnected");
		header.createSpan({ text: label });

		if (!isConfigured) {
			section.createEl("small", {
				text: `Configure ${label} nas configurações do SmartWrite.`,
				cls: "sw-publisher-note-meta",
			});
		}
	}

	private renderActions(container: HTMLElement, meta: PostMeta) {
		const actions = container.createDiv("sw-publisher-actions");

		const draftBtn = actions.createEl("button", {
			text: "Salvar rascunho",
			cls: "sw-btn sw-btn-secondary",
		});
		draftBtn.addEventListener("click", () => { void this.handlePublish(meta, true); });

		const publishBtn = actions.createEl("button", {
			text: "Publicar agora",
			cls: "sw-btn sw-btn-primary",
		});
		publishBtn.addEventListener("click", () => { void this.handlePublish(meta, false); });
	}

	// ── Helpers ───────────────────────────────────────────────────────────

	private extractMeta(): PostMeta {
		const file = this.activeFile;
		if (!file) {
			return { title: "Sem título", status: "draft" };
		}

		const cache = this.app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter ?? {};

		return {
			title: (fm["title"] as string | undefined) ?? file.basename,
			subtitle: fm["subtitle"] as string | undefined,
			tags: (fm["tags"] as string[] | undefined) ?? [],
			status: (fm["status"] as "draft" | "published" | undefined) ?? "draft",
			platforms: (fm["platforms"] as ("substack" | "wordpress")[] | undefined),
		};
	}

	private isPlatformConfigured(platformId: string): boolean {
		if (platformId === "substack") return this.substack.isConfigured();
		if (platformId === "wordpress") return this.wordpress.isConfigured();
		return false;
	}

	private async handlePublish(meta: PostMeta, asDraft: boolean) {
		this.configureAdapters();
		const file = this.activeFile;
		if (!file) return;

		const content = await this.app.vault.read(file);
		// TODO: Implementar converter Markdown→HTML (Fase seguinte)
		const htmlContent = `<p>${content}</p>`;

		if (this.substack.isConfigured()) {
			await this.substack.testConnection();
			const result = await this.substack.publish(meta.title, htmlContent, meta, asDraft);
			console.debug(`[SmartWrite Publisher] Substack: ${result.success ? result.url : result.error}`);
		}
		if (this.wordpress.isConfigured()) {
			const result = await this.wordpress.publish(meta.title, htmlContent, meta, asDraft);
			console.debug(`[SmartWrite Publisher] WordPress: ${result.success ? result.url : result.error}`);
		}
		this.render();
	}

	private configureAdapters(): void {
		const s = this.plugin.settings;
		if (s.substackCookie && s.substackUrl) {
			this.substack.configure(s.substackCookie, s.substackUrl);
		}
		if (s.wordpressUrl && s.wordpressUsername && s.wordpressAppPassword) {
			this.wordpress.configure(s.wordpressUrl, s.wordpressUsername, s.wordpressAppPassword);
		}
	}
}
