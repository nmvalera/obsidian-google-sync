import { calendar_v3 } from '@googleapis/calendar';
import { DEFAULT_EVENT_TEMPLATE } from '@/settings/default-templates';
import { EventResult } from '@/types';
import { getTemplateContents } from '@/utils/template';
import { App, moment } from 'obsidian';

export class Event {
	#event: EventResult;
	#template: string | undefined;
	#dateFormat: string | undefined;

	constructor(e: EventResult, templateFile: string | undefined, dateFormat: string | undefined) {
		this.#event = e;
		this.#template = templateFile;
		this.#dateFormat = dateFormat;
	}

	generateFromTemplate = async (app: App) => {
		const rawTemplate = await getTemplateContents(app, this.#template);
		return this.applyTemplateTransformations(
			rawTemplate && rawTemplate.length > 0 ? rawTemplate : DEFAULT_EVENT_TEMPLATE
		);
	};

	private applyTemplateTransformations = (rawTemplateContents: string): string => {
		let templateContents = rawTemplateContents;

		const transform = {
			accountName: this.#event.accountName,
			calendar: this.#event.calendarId,
			event: JSON.stringify(this.#event.event, null, 2)
		};

		for (const [k, v] of Object.entries(transform)) {
			templateContents = templateContents.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'gi'), v || '');
		}

		return templateContents;
	};
}
