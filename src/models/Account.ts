import { GoogleCredentials } from '@/types';
import { AuthModal } from '@/ui/auth-modal';
import { calendar_v3 } from '@googleapis/calendar';
import { people_v1 } from '@googleapis/people';
import { App } from 'obsidian';

export class GoogleAccount {
	private static STORAGEKEY = 'google-lookup:accounts';
	static #credentials: GoogleCredentials;
	#token: string | undefined;
	#accountName: string;

	#calendarIds: string[];

	#peopleService: people_v1.People | undefined;
	#calendarService: calendar_v3.Calendar | undefined;

	static #allAccounts: Record<string, GoogleAccount> = {};

	constructor(name: string, token: string | undefined, calendarIds: string[]) {
		this.#accountName = name;
		this.#token = token;
		this.#calendarIds = calendarIds;
	}

	static get credentials() {
		return GoogleAccount.#credentials;
	}

	static set credentials(c: GoogleCredentials) {
		GoogleAccount.#credentials = c;
	}

	static getAllAccounts() {
		return Object.values(GoogleAccount.#allAccounts);
	}

	static removeAllAccounts() {
		GoogleAccount.#allAccounts = {};
	}

	static createNewAccount(app: App, callback: () => void) {
		const account = new GoogleAccount('NEW_ACCOUNT', undefined, ["primary"]);
		AuthModal.createAndOpenNewModal(app, account, callback);
	}

	static writeAccountsToStorage() {
		const accountsData: any = {};
		for (const a of Object.values(GoogleAccount.#allAccounts)) {
			accountsData[a.accountName] = {token: a.token, calendars: a.calendarIds};
		}
		window.localStorage.setItem(GoogleAccount.STORAGEKEY, JSON.stringify(accountsData));
	}

	static loadAccountsFromStorage() {
		const storedValue = window.localStorage.getItem(GoogleAccount.STORAGEKEY);
		if (!storedValue) {
			return;
		}

		const data = JSON.parse(storedValue);

		for (const accountName of Object.keys(data)) {
			new GoogleAccount(accountName, data[accountName]["token"],  data[accountName]["calendars"]).addToAccountsList();
		}
	}
	get token() {
		return this.#token;
	}
	set token(t: string | undefined) {
		console.log(`setting token to ${t}`);
		this.#token = t;
	}

	get accountName() {
		return this.#accountName;
	}

	set accountName(name: string) {
		this.#accountName = name;
	}

	get calendarIds() {
		return this.#calendarIds;
	}

	set calendarIds(ids: string[]) {
		console.log(`setting calendarIds to ${ids}`)
		this.#calendarIds = ids;
	}

	set peopleService(service: people_v1.People | undefined) {
		this.#peopleService = service;
	}

	get peopleService() {
		return this.#peopleService;
	}

	set calendarService(service: calendar_v3.Calendar | undefined) {
		this.#calendarService = service;
	}

	get calendarService() {
		return this.#calendarService;
	}

	addToAccountsList() {
		GoogleAccount.#allAccounts[this.#accountName] = this;
	}

	removeFromAccountsList() {
		GoogleAccount.#allAccounts = Object.fromEntries(
			Object.entries(GoogleAccount.#allAccounts).filter((k) => k[0] !== this.#accountName)
		);
	}
}
