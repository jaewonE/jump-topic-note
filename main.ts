import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	FrontMatterCache,
} from "obsidian";
import { SelectableModal, SelectableItem } from "./selectableItem";

interface JumpTopicNoteSettings {
	topicProperty: string;
}

const DEFAULT_SETTINGS: JumpTopicNoteSettings = {
	topicProperty: "parents",
};

interface ParentTopicItem extends SelectableItem {
	//
	name: string; // Display name (filename or alias) for the modal
	linkText: string; // Original wikilink text, e.g., "[[My Note|Alias]]"
}

export default class JumpTopicNotePlugin extends Plugin {
	settings: JumpTopicNoteSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "jump-to-parent-topic",
			name: "상위 주제 노트로 이동", // Jump to parent topic note
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "W" }], // Default: Command/Ctrl+Shift+W
			callback: () => this.executeJumpLogic(),
		});

		this.addSettingTab(new JumpTopicNoteSettingTab(this.app, this));
		console.log("Jump Topic Note plugin loaded.");
	}

	onunload() {
		console.log("Jump Topic Note plugin unloaded.");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private extractDisplayNameFromWikilink(wikilink: string): string {
		const bareLink = wikilink.substring(2, wikilink.length - 2);
		const parts = bareLink.split("|");
		// If there's an alias (parts[1]), use it; otherwise, use the link itself (parts[0])
		// The link itself might be a path, so take the part after the last '/'
		const mainPart = parts.length > 1 ? parts[1] : parts[0];
		const lastSlashIndex = mainPart.lastIndexOf("/");
		return lastSlashIndex === -1
			? mainPart
			: mainPart.substring(lastSlashIndex + 1);
	}

	private extractInternalPathFromWikilink(wikilink: string): string {
		const bareLink = wikilink.substring(2, wikilink.length - 2);
		const parts = bareLink.split("|");
		let linkPath = parts[0];
		// Remove heading or block reference for path resolution
		linkPath = linkPath.split("#")[0];
		linkPath = linkPath.split("^")[0];
		return linkPath;
	}

	private async navigateToLink(linkText: string, sourcePath: string) {
		const internalPath = this.extractInternalPathFromWikilink(linkText);
		const targetFile = this.app.metadataCache.getFirstLinkpathDest(
			internalPath,
			sourcePath
		);

		if (!targetFile) {
			const message = `오류: 상위 주제 노트 '${internalPath}'가(이) 존재하지 않습니다.`;
			new Notice(message);
			console.error(
				`Target note not found for link: '${linkText}'. Resolved internal path: '${internalPath}'. Source: '${sourcePath}'.`
			);
			return;
		}

		try {
			// Open file with targetFile(TFile) directly
			// getLeaf => true ? 새 탭 열기 : 현재 탭에서 열기
			await this.app.workspace.getLeaf(false).openFile(targetFile);
		} catch (error) {
			new Notice(`Error opening link: ${linkText}`);
			console.error("Error opening link:", error);
		}
	}

	private async executeJumpLogic() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			// No active file, do nothing
			return;
		}

		const fileCache = this.app.metadataCache.getFileCache(activeFile);
		if (!fileCache || !fileCache.frontmatter) {
			// No frontmatter, or 'parents' property does not exist (implicitly handles this)
			return;
		}

		const frontmatter = fileCache.frontmatter;
		const topicPropertyKey = this.settings.topicProperty;
		const rawParentsEntry = frontmatter[topicPropertyKey];

		// 1. parents 속성 자체가 없는 경우: 아무 것도 수행하지 않는다.
		if (rawParentsEntry === undefined || rawParentsEntry === null) {
			return;
		}

		// Check if the property is an array (list)
		if (!Array.isArray(rawParentsEntry)) {
			new Notice(
				`오류: '${topicPropertyKey}' 속성이 YAML 목록(리스트) 형식이 아닙니다. 파일: ${activeFile.basename}`
			);
			console.error(
				`The '${topicPropertyKey}' property in file '${activeFile.path}' is not a list (array). Found:`,
				rawParentsEntry
			);
			return;
		}

		const parentsList: any[] = rawParentsEntry;

		// 1. parents 속성 값이 없을(length == 0) 경우 아무 것도 수행하지 않는다.
		if (parentsList.length === 0) {
			return;
		}

		const validWikilinks: string[] = [];
		let invalidEntriesFound = false;

		for (const item of parentsList) {
			if (typeof item === "string" && /^\[\[.+?\]\]$/.test(item)) {
				validWikilinks.push(item);
			} else {
				invalidEntriesFound = true;
				console.error(
					`잘못된 항목: '${topicPropertyKey}' 목록에 유효하지 않은 위키링크가 아닌 항목이 포함되어 있습니다: '${item}'. 파일: ${activeFile.basename}`
				);
			}
		}

		// 2. parents 속성에 "위키 링크"가 아닌 일반 문자열이 있는 경우
		if (invalidEntriesFound) {
			new Notice(
				`경고: '${topicPropertyKey}' 속성에 위키링크 형식이 아닌 항목이 포함되어 있습니다. 작업을 중단합니다.`
			);
			// console error already logged above for each invalid item
			return;
		}

		// If after filtering, there are no valid wikilinks (e.g. all were invalid)
		if (validWikilinks.length === 0) {
			return;
		}

		// 2. parents 속성 값이 한 개만 존재(length == 1)인 경우
		if (validWikilinks.length === 1) {
			await this.navigateToLink(validWikilinks[0], activeFile.path);
		}
		// 3. parents 속성 값이 두 개 이상 존재(length > 1)인 경우
		else if (validWikilinks.length > 1) {
			const modalItems: ParentTopicItem[] = validWikilinks.map(
				(link) => ({
					name: this.extractDisplayNameFromWikilink(link),
					linkText: link,
				})
			);

			new SelectableModal<ParentTopicItem>(
				this.app,
				modalItems,
				async (selectedItem) => {
					await this.navigateToLink(
						selectedItem.linkText,
						activeFile.path
					);
				},
				"Select superior topic note" // Modal title
			).open();
		}
	}
}

class JumpTopicNoteSettingTab extends PluginSettingTab {
	plugin: JumpTopicNotePlugin;

	constructor(app: App, plugin: JumpTopicNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h3", { text: "Jump Topic Note Settings" });

		new Setting(containerEl)
			.setName("Superior Topic Property Name (Topic property name)")
			.setDesc(
				"The name of the YAML property that includes the superior topic. This property must be in list format."
			)
			.addText((text) =>
				text
					.setPlaceholder("EX: parents")
					.setValue(this.plugin.settings.topicProperty)
					.onChange(async (value) => {
						this.plugin.settings.topicProperty =
							value.trim() || DEFAULT_SETTINGS.topicProperty;
						await this.plugin.saveSettings();
					})
			);
	}
}
