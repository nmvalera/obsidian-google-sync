import { GoogleAccount } from '@/models/Account';
import { calendar_v3 } from '@googleapis/calendar';

export type EventResult = {
	accountName: string;
	calendarId: string;
	event: calendar_v3.Schema$Event;
};
