import { App, PluginSettingTab, Setting } from 'obsidian';
import { FolderSuggest, } from "./suggesters/FolderSuggest";
import { FileSuggest } from "./suggesters/FileSuggest";
import GoogleLookupPlugin from '@/main';
import { GoogleLookupPluginSettings, KeysMatching } from '@/types';
import { GoogleAccount } from '@/models/Account';
import { AuthModal } from '@/ui/auth-modal';
import { ConfirmModal } from '@/ui/confirm-modal';

export const DEFAULT_SETTINGS: Partial<GoogleLookupPluginSettings> = {
	contacts_enabled: false,
	contacts_template: '',
	contacts_folder: '',
	contacts_filename_format: '{{firstname}} {{lastname}}',

	events_enabled: false,
	events_template: '',
	events_folder: '',
	events_default_name: '',

	client_redirect_uri_port: '42601',
};

type CommonSettingParams = {
	container?: HTMLElement;
	name: string;
	description?: string | DocumentFragment;
	defaultValue?: string;
};
type ToggleSettingParams = { key: KeysMatching<GoogleLookupPluginSettings, boolean> } & CommonSettingParams;

type TextInputSettingParams = {
	placeholder?: string;
	key: KeysMatching<GoogleLookupPluginSettings, string>;
} & CommonSettingParams;

export class GoogleLookupSettingTab extends PluginSettingTab {
	plugin: GoogleLookupPlugin;
	accountsEl: HTMLElement;

	constructor(app: App, plugin: GoogleLookupPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.accountsEl = this.containerEl.createDiv();
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		if (!this.plugin.settings) {
			return;
		}

		this.insertHeaderToggleSetting({
			name: 'Contacts',
			key: 'contacts_enabled'
		});
		this.insertFilePathInputSetting({
			name: 'Contact Note Template',
			description: 'Choose the file to use as template',
			key: 'contacts_template_file'
		});
		this.insertFolderPathInputSetting({
			name: 'Contact Folder',
			description: 'New contact notes will be created here',
			key: 'contacts_folder'
		});
		this.insertTextInputSetting({
			name: 'Filename format for people notes',
			description: getDocumentFragmentWithLink(
				'When the option to move and rename is enabled, the person note will have a title based on this format.  Default value is "{{lastname}}, {firstname}".  See template options',
				'here',
				'https://ntawileh.github.io/obsidian-google-lookup/person'
			),

			placeholder: '{{lastname}}, {{firstname}}',
			key: 'contacts_filename_format'
		});

		this.insertHeaderToggleSetting({
			name: 'Events',
			key: 'events_enabled'
		});
		this.insertFilePathInputSetting({
			name: 'Event Note Template',
			description: 'Choose the file to use as template',
			key: 'events_template_file'
		});
		this.insertFolderPathInputSetting({
			name: 'Event Folder',
			description: 'New event notes will be created here',
			key: 'events_folder'
		});
		this.insertTextInputSetting({
			name: 'Default Name for Event notes',
			description:'Default Name for an event in case the event does not have a summary.',
			defaultValue: "Untitled",
			placeholder: 'Untitled',
			key: 'events_default_name'
		});

		containerEl.createEl('h3', { text: 'Google Client' });
		this.insertTextInputSetting({
			name: 'Client ID',
			description: 'Client ID for your Google API application',
			placeholder: '123456789123-example29i02ttu92h0vftuhff2jtgg.apps.googleusercontent.com',
			key: 'client_id'
		});
		this.insertTextInputSetting({
			name: 'Client Secret',
			description: 'Client Secret for your Google API application',
			key: 'client_secret'
		});
		this.insertTextInputSetting({
			name: 'Redirect URI port',
			description:
				'The port number that this Obsidian plugin will listen to Google authentication redirects on.  Do not change this unless you are having issues.',
			key: 'client_redirect_uri_port'
		});

		containerEl.createEl('h3', { text: 'Accounts' });
		this.displayAccounts();
		this.containerEl.appendChild(this.accountsEl);
	}

	private displayAccounts() {
		const { accountsEl } = this;
		accountsEl.empty();
		for (const account of GoogleAccount.getAllAccounts()) {
			this.insertAccountSetting({
				name: account.accountName,
				container: this.accountsEl,
				account
			});
		}
		new Setting(this.accountsEl).addButton((b) => {
			b.setButtonText('Add Account');
			b.setCta();
			b.onClick(() => {
				GoogleAccount.createNewAccount(this.plugin.app, () => {
					this.displayAccounts();
				});
			});
		});
	}

	private insertTextInputSetting({
		container = this.containerEl,
		placeholder,
		key,
		name,
		defaultValue,
		description
	}: TextInputSettingParams) {
		new Setting(container)
			.setName(name)
			.setDesc(description || '')
			.addText((text) => {
				text
					.setPlaceholder(placeholder ? placeholder : '')
					.onChange(async (v) => {
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						this.plugin.settings![key] = v;
						await this.plugin.saveSettings();
					})
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					.setValue(this.plugin.settings![key] || defaultValue || '');
			});
	}

	private insertFolderPathInputSetting({
		container = this.containerEl,
		placeholder,
		key,
		name,
		description
	}: TextInputSettingParams) {
		new Setting(container)
			.setName(name)
			.setDesc(description || '')
			.addSearch((cb) => {
                new FolderSuggest(this.app, cb.inputEl);
                cb.setPlaceholder(placeholder || "Example: folder1/folder2")
                    .setValue(this.plugin.settings![key] || '')
                    .onChange((new_folder) => {
                        this.plugin.settings![key] = new_folder;
						this.plugin.saveSettings();
                    });
                // @ts-ignore
                cb.containerEl.addClass("templater_search");
            });
	}

	private insertFilePathInputSetting({
		container = this.containerEl,
		placeholder,
		key,
		name,
		description
	}: TextInputSettingParams) {
		new Setting(container)
			.setName(name)
			.setDesc(description || '')
			.addSearch((cb) => {
                new FileSuggest(this.app, cb.inputEl);
                cb.setPlaceholder(placeholder || "Example: folder/note")
                    .setValue(this.plugin.settings![key] || '')
                    .onChange((new_folder) => {
                        this.plugin.settings![key] = new_folder;
						this.plugin.saveSettings();
                    });
                // @ts-ignore
                cb.containerEl.addClass("templater_search");
            });
	}

	private insertToggleSetting({ container = this.containerEl, key, name, description }: ToggleSettingParams) {
		new Setting(container)
			.setName(name)
			.setDesc(description || '')
			.addToggle((tc) => {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				tc.setValue(this.plugin.settings![key]).onChange(async (v) => {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					this.plugin.settings![key] = v;
					await this.plugin.saveSettings();
				});
			});
	}

	private insertHeaderToggleSetting({ container = this.containerEl, key, name }: ToggleSettingParams) {
		new Setting(container)
			.setName(name)
			.setHeading()
			.addToggle((tc) => {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				tc.setValue(this.plugin.settings![key]).onChange(async (v) => {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					this.plugin.settings![key] = v;
					await this.plugin.saveSettings();
				});
			});
	}

	private insertAccountSetting({
		container = this.containerEl,
		name,
		account
	}: {
		container?: HTMLElement;
		name: string;
		account: GoogleAccount;
	}) {
		new Setting(container)
			.setName(name)
			.addTextArea((ta) => {
				ta.setPlaceholder('calendar IDs')
					.setValue(account.calendarIds.join(',') || '')
					.onChange(async (v) => {
						account.calendarIds = v.split(',').map((s) => s.trim());
						GoogleAccount.writeAccountsToStorage();
					});
			})
			.addExtraButton((b) => {
				b.setIcon('reset');
				b.setTooltip('refresh account credentials');
				b.onClick(() => {
					AuthModal.createAndOpenNewModal(this.app, account, () => {
						this.displayAccounts();
					});
				});
			})
			.addExtraButton((b) => {
				b.setIcon('trash');
				b.setTooltip('remove account and delete login credentials');
				b.onClick(() => {
					new ConfirmModal(this.app, `Are you sure you want to remove account ${account.accountName}?`, () => {
						console.log(`removing account ${account.accountName}`);
						account.removeFromAccountsList();
						GoogleAccount.writeAccountsToStorage();
						this.displayAccounts();
					}).open();
				});
			});
	}
}

const getDocumentFragmentWithLink = (text: string, linkText: string, href: string) => {
	const fragment = document.createDocumentFragment();
	fragment.createSpan({ text: `${text} ` });
	fragment.createEl('a', {
		href,
		text: linkText
	});

	return fragment;
};
