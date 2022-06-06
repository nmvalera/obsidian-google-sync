import { PersonSuggestModal } from '@/ui/person-modal';
import { GoogleAccount } from 'models/Account';
import { MarkdownView, Plugin } from 'obsidian';
import { EventSuggestModal } from '@/ui/calendar-modal';
import { DEFAULT_SETTINGS, GoogleLookupSettingTab } from './settings';
import { GoogleLookupPluginSettings } from './types';

export default class GoogleLookupPlugin extends Plugin {
	settings: GoogleLookupPluginSettings | undefined;

	addCommandIfMarkdownView(name: string, id: string, func: () => void) {
		this.addCommand({
			id,
			name,
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						func();
					}
					return true;
				}
			}
		});
	}

	async onload() {
		await this.loadSettings();

		this.addCommandIfMarkdownView('Insert Contact Info', 'insert-contact-info', () => {
			new PersonSuggestModal(this.app).open();
		});
		this.addCommandIfMarkdownView('Insert Event Info', 'insert-event-info', () => {
			new EventSuggestModal(this.app).open();
		});

		this.addSettingTab(new GoogleLookupSettingTab(this.app, this));

		new GoogleAccount(
			'Clover',
			'/Users/nadimtawileh/tmp/credentials.json',
			'/Users/nadimtawileh/tmp/token-clover.json'
		);
		new GoogleAccount(
			'Personal',
			'/Users/nadimtawileh/tmp/credentials.json',
			'/Users/nadimtawileh/tmp/token-tawileh.json'
		);
	}

	onunload() {
		GoogleAccount.removeAllAccounts();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
