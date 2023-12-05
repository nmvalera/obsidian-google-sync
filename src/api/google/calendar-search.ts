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

		return response.data.items.map((item): EventResult => {
			const { summary, description, htmlLink, organizer, start, end, attendees } = item;
			return {
				summary: summary || '',
				description: description || '',
				accountSource: accountName,
				calendarId: calendarId,
				htmlLink,
				organizer: organizer?.email || '',
				startTime: start?.dateTime,
				endTime: end?.dateTime,
				attendees:
					attendees?.map((a) => {
						return { response: a.responseStatus, email: a.email, name: a.displayName };
					}) || []
			};
		});
	} catch (err: any) {
		console.warn(`Cannot query calendar service ${err.message}`);
	}
};