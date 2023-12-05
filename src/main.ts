/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PersonSuggestModal } from '@/ui/person-modal';
import { GoogleAccount } from 'models/Account';
import { Command, Notice, Plugin, TFolder, TFile } from 'obsidian';
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

	addSyncCommand(name: string, id: string, func: () => void) {
		this.addCommand({
			id,
			name,
			callback: () => {
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
		this.addSyncCommand('Sync Contacts', 'sync-contacts', async () => {
			let personModal = new PersonSuggestModal(this.app, {
				template: this.settings!.contacts_template_file,
				moveToFolder: this.settings!.contacts_folder,
				newFilenameTemplate: this.settings!.contacts_filename_format
			})
			
			// Delete all existing contacts in vault Contact folder before syncing
			let folder = this.app.vault.getAbstractFileByPath(this.settings!.contacts_folder)

			// If folder doesn't exist, create it
			if (!folder) {
				folder = await this.app.vault.createFolder(this.settings!.contacts_folder)
			}

			// Test if folder is a TFOLDER
			if (!(folder instanceof TFolder)) {
				new Notice('Contacts folder must be a folder');
				return;
			}

			// Cache all files in folder
			let filesCache = new Map<string, {stillExist: boolean, file: TFile}>()
			folder.children.forEach((file) => {filesCache[file.path] = {stillExist: false, file: file}})

			let contacts = await personModal.getSuggestions('all')
			for (let contact of contacts) {
				await personModal.createOrUpdatePerson(contact, filesCache)
			}

			// Trash all remaining files in cache
			for (let file of Object.values(filesCache)) {
				if (!file.stillExist) {
					await this.app.vault.trash(file.file, true)
				}
			}
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
