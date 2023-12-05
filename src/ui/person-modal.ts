import { getPeopleService, searchContactsAndDirectory, listContacts } from '@/api/google/people-search';
import { GoogleAccount } from '@/models/Account';
import { App, Notice, SuggestModal, TFile } from 'obsidian';
import { PersonResult } from '@/types';
import { insertIntoEditorRange, maybeGetSelectedText, renameFile, createNewFile, sanitizeHeading } from '@/utils';
import { Person } from '@/models/Person';
import { AuthModal } from './auth-modal';

type ModalOptions = {
	moveToFolder: string;
	template: string | undefined;
	newFilenameTemplate: string | undefined;
};
export class PersonSuggestModal extends SuggestModal<PersonResult> {
	#initialQuery: string | undefined;
	#ready = false;
	#options: ModalOptions;

	async getSuggestions(query: string): Promise<PersonResult[]> {
		!this.#ready && (await this.initServices());
		if (query.length === 0) {
			query = this.#initialQuery ? this.#initialQuery : '';
		}

		if (query.length < 3) {
			return [];
		}

		const results: PersonResult[] = [];

		for (const account of GoogleAccount.getAllAccounts()) {
			if (!account.peopleService) {
				continue;
			}
			const accountResults = await listContacts({
				service: account.peopleService,
				accountName: account.accountName
			});
			if (accountResults) {
				results.push(...accountResults);
			} else {
				AuthModal.createAndOpenNewModal(this.app, account, () => {
					this.close();
				});

				break;
			}
		}
		return results ? results : [];
	}

	renderSuggestion(person: PersonResult, el: HTMLElement) {
		el.createEl('div', { text: person.displayNameLastFirst });
		el.createEl('small', {
			text: `(${person.accountSource}) ${person.org?.title ? person.org.title : ''} ${
				person.emails ? person.emails[0] : ''
			}`
		});
	}

	async onChooseSuggestion(person: PersonResult, evt: MouseEvent | KeyboardEvent) {
		await this.createPerson(person);
	}

	async createPerson(person: PersonResult) {
		new Notice(`Create Contact: ${person.firstName}  ${person.lastName}`);
		const p = new Person(person, this.#options.template, this.#options.newFilenameTemplate);
		const filePath = `${this.#options.moveToFolder}/${sanitizeHeading(p.getTitle())}.md`
		createNewFile(this.app, filePath, await p.generateFromTemplate(this.app));
	}

	async createOrUpdatePerson(person: PersonResult, filesCache: Map<string, {stillExist: boolean, file: TFile}>) {
		const p = new Person(person, this.#options.template, this.#options.newFilenameTemplate);
		const filePath = `${this.#options.moveToFolder}/${sanitizeHeading(p.getTitle())}.md`
		
		let fileCache = filesCache.get(filePath)
		if (fileCache) {
			new Notice(`Trash Existing Contact: ${person.firstName}  ${person.lastName}`);
			console.log(`trashing file ${filePath}`)
			await this.app.vault.trash(fileCache.file, true)
			fileCache.stillExist = true
		}

		new Notice(`Create Contact: ${person.firstName}  ${person.lastName}`);

		await createNewFile(this.app, filePath, await p.generateFromTemplate(this.app));
	}

	private async initServices() {
		for (const account of GoogleAccount.getAllAccounts()) {
			if (account.token) {
				account.peopleService = await getPeopleService({
					credentials: GoogleAccount.credentials,
					token: account.token
				});
			}
		}
		this.#ready = true;
	}

	constructor(app: App, options: ModalOptions) {
		super(app);
		this.#options = options;
		this.emptyStateText =
			GoogleAccount.getAllAccounts().length > 0
				? 'no results found yet'
				: 'no accounts have been added yet.  go to settings to create.';
		this.setInstructions([
			{
				command: 'find contact',
				purpose: 'search by any contact keyword (first, last, email).  Requires at least 3 characters.'
			}
		]);
		const selectedText = maybeGetSelectedText(this.app);
		const fileName = this.app.workspace.getActiveFile()?.basename;

		this.#initialQuery = selectedText ? selectedText : fileName ? fileName : undefined;
	}
}
