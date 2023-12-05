/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PersonSuggestModal } from '@/ui/person-modal';
import { GoogleAccount } from 'models/Account';
import { Notice, Plugin } from 'obsidian';
import { EventSuggestModal } from '@/ui/calendar-modal';
import { DEFAULT_SETTINGS, GoogleLookupSettingTab } from './settings';
import { GoogleLookupPluginSettings } from './types';
import { getGoogleCredentials, hasGoogleCredentials } from './settings/google-credentials';

export default class GoogleLookupPlugin extends Plugin {
	settings: GoogleLookupPluginSettings | undefined;

	addCommandIfMarkdownView(name: string, id: string, func: () => void) {
		this.addCommand({
			id,
			name,
			editorCallback: () => {
				if (!hasGoogleCredentials(this)) {
					new Notice('Google credentials not set up yet.  Go to Settings to configure.');
					return;
				} else {
					func();
				}
			}
		});
	}

	async onload() {
		await this.loadSettings();

		this.addCommandIfMarkdownView('Insert Contact Info', 'insert-contact-info', () => {
			new PersonSuggestModal(this.app, {
				template: this.settings!.contacts_template_file,
				moveToFolder: this.settings!.contacts_folder,
				newFilenameTemplate: this.settings!.contacts_filename_format
			}).open();
		});
		this.addCommandIfMarkdownView('Insert Event Info', 'insert-event-info', () => {
			new EventSuggestModal(this.app, { 
				folder: this.settings!.events_folder,
				defaultName: this.settings!.events_default_name,
				template: this.settings!.events_template_file
			}).open();
		});

		this.addSettingTab(new GoogleLookupSettingTab(this.app, this));

		GoogleAccount.loadAccountsFromStorage();
	}

	onunload() {
		GoogleAccount.removeAllAccounts();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		GoogleAccount.credentials = getGoogleCredentials(this);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		GoogleAccount.credentials = getGoogleCredentials(this);
	}
}
