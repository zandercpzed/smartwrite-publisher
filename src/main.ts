// SCRIPT: src/main.ts
// DESCRIÇÃO: Entry point do SmartWrite Publisher — módulo gerenciado pelo Orchestrator.
//            Registra a view do Publisher na sidebar e os comandos de publicação.
// CHAMADO POR: Obsidian (ao ativar o plugin via Orchestrator)
// CONTRATO: Exporta classe default Plugin que estende Plugin do Obsidian

import { Plugin, TFile } from "obsidian";
import { PublisherSettings, DEFAULT_SETTINGS } from "./types";
import { PublisherPanel, PUBLISHER_VIEW_TYPE } from "./ui/PublisherPanel";

export default class SmartWritePublisher extends Plugin {
	settings!: PublisherSettings;

	async onload() {
		await this.loadSettings();

		// Registrar a panel view (hospedada na sidebar do Orchestrator)
		this.registerView(
			PUBLISHER_VIEW_TYPE,
			(leaf) => new PublisherPanel(leaf, this)
		);

		// Ribbon icon de acesso rápido
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		this.addRibbonIcon("send", "SmartWrite publisher", () => {
			void this.activatePanel();
		});

		// Comandos
		this.addCommand({
			id: "open-publisher",
			name: "Open publisher panel",
			callback: () => { void this.activatePanel(); },
		});

		this.addCommand({
			id: "publish-active-note",
			name: "Publish active note",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (!checking) { void this.publishActiveNote(file); }
				return true;
			},
		});

		// Sincronizar painel quando a nota ativa muda
		const debouncedSync = this.debounce(() => { void this.syncActiveNote(); }, 400);
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", debouncedSync)
		);
	}

	onunload() {
		// Obsidian desregistra as views automaticamente — não chamar detachLeavesOfType
		// pois isso resetaria a posição salva pelo usuário (obsidianmd/detach-leaves)
	}

	// ── Settings ────────────────────────────────────────────────────────────

	async loadSettings() {
		const data = await this.loadData() as Partial<PublisherSettings> | undefined;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// ── Navigation ──────────────────────────────────────────────────────────

	async activatePanel() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(PUBLISHER_VIEW_TYPE)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false)!;
			await leaf.setViewState({ type: PUBLISHER_VIEW_TYPE, active: true });
		}

		void workspace.revealLeaf(leaf);
	}

	// ── Active Note Sync ─────────────────────────────────────────────────────

	private async syncActiveNote() {
		const file = this.app.workspace.getActiveFile();
		const leaves = this.app.workspace.getLeavesOfType(PUBLISHER_VIEW_TYPE);
		for (const leaf of leaves) {
			if (leaf.view instanceof PublisherPanel) {
				leaf.view.onNoteChanged(file ?? null);
			}
		}
	}

	private async publishActiveNote(file: TFile) {
		const leaves = this.app.workspace.getLeavesOfType(PUBLISHER_VIEW_TYPE);
		const panel = leaves[0]?.view;
		if (panel instanceof PublisherPanel) {
			await panel.publishNote(file);
		} else {
			await this.activatePanel();
		}
	}

	// ── Utilities ────────────────────────────────────────────────────────────

	private debounce(fn: () => void, ms: number): () => void {
		let timer: ReturnType<typeof setTimeout>;
		return () => {
			clearTimeout(timer);
			timer = setTimeout(fn, ms);
		};
	}
}
