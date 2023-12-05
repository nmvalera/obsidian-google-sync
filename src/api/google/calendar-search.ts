import { calendar_v3, calendar } from '@googleapis/calendar';
import { getAuthClient } from './auth';
import { EventResult, GoogleServiceOptions } from '@/types';

interface QueryOptions {
	service: calendar_v3.Calendar;
	accountName: string;
	calendarIds: string[];
}

export const getCalendarService = async ({ credentials, token }: GoogleServiceOptions) => {
	const auth = await getAuthClient(credentials, token);

	return calendar({
		version: 'v3',
		auth: auth
	});
};

export const searchCalendarsEvents = async (
	query: moment.Moment,
	{ service, accountName, calendarIds }: QueryOptions
): Promise<EventResult[] | undefined> => {	
	// For each calendar, query the events
	let events: any[] = []
	for (const calendarId of calendarIds) {
		try {
			const items = await searchCalendarEvents(service, accountName, calendarId, query)
			events = events.concat(items)
		} catch (err: any) {
			console.warn(`${err.message}`);
		}
	}

	console.log(`Found ${events.length} events for ${accountName} on ${query.format()}`);

	return events;
};

export const searchCalendarEvents = async (
	service: calendar_v3.Calendar,
	accountName: string,
	calendarId: string,
	query: moment.Moment,
): Promise<EventResult[] | undefined> => {	
	try {
		const response = await service.events.list({
			calendarId: calendarId,
			maxAttendees: 100,
			singleEvents: true,
			maxResults: 12,
			orderBy: 'startTime',
			timeMin: query.startOf('day').format(),
			timeMax: query.endOf('day').format()
		});

		if (response.status !== 200) {
			console.warn(`error querying people api ${response.statusText}`);
			return;
		}

		if (!response.data?.items || response.data?.items?.length === 0) {
			return [];
		}

		return response.data.items.map((event: calendar_v3.Schema$Event) => {return {event: event, accountName: accountName, calendarId: calendarId}});
	} catch (err: any) {
		console.warn(`Cannot query calendar service ${err.message}`);
	}
};