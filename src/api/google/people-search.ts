import { people_v1, people } from '@googleapis/people';
import { getAuthClient } from './auth';
import { GoogleServiceOptions, PersonResult } from '@/types';
import { formatBirthday } from '@/utils';

interface QueryOptions {
	service: people_v1.People;
	accountName: string;
}

const readMask =
	'names,nicknames,emailAddresses,phoneNumbers,biographies,calendarUrls,organizations,metadata,birthdays,urls,clientData,relations,userDefined,biographies,addresses,memberships';

const parsePersonData = (
	p: people_v1.Schema$Person,
	type: 'DIRECTORY' | 'CONTACTS',
	accountSource: string,
	contactGroupMap?: Map<string, string>
): PersonResult => {
	const {
		names,
		organizations,
		emailAddresses,
		phoneNumbers,
		resourceName,
		birthdays,
		relations,
		userDefined,
		clientData,
		urls,
		biographies,
		addresses,
		nicknames,
		memberships
	} = p;
	return {
		accountSource,
		resourceName,
		displayNameLastFirst: names?.[0]?.displayNameLastFirst ?? 'unknown',
		firstName: names?.[0]?.givenName ?? '',
		lastName: names?.[0]?.familyName ?? '',
		middleName: names?.[0]?.middleName ?? '',
		org:
			organizations && organizations[0]
				? { department: organizations[0].department, title: organizations[0].title, name: organizations[0].name }
				: undefined,
		type,
		emails: emailAddresses ? emailAddresses.map((e) => e.value) : [],
		phones: phoneNumbers ? phoneNumbers.map((e) => e.canonicalForm || e.value || '') : [],
		birthdays: birthdays ? birthdays.map(({ date }) => (date ? formatBirthday(date) : '')) : [],
		relations: relations
			? relations.map(({ person, type }) => {
					return { person, type };
			  })
			: [],
		userDefinedData: userDefined
			? userDefined.map(({ key, value }) => {
					return { key, value };
			  })
			: [],
		clientData: clientData
			? clientData.map(({ key, value }) => {
					return { key, value };
			  })
			: [],
		urls: urls
			? urls.map(({ type, value }) => {
					return { type, value };
			  })
			: [],
		bio: biographies && biographies[0] ? biographies[0].value : '',
		addresses: addresses
			? addresses.map(
					({ type, poBox, streetAddress, extendedAddress, city, region, postalCode, country, countryCode }) => {
						return { type, poBox, streetAddress, extendedAddress, city, region, postalCode, country, countryCode };
					}
			  )
			: [],
		nicknames: nicknames
			? nicknames.map(({ type, value }) => {
					return { type, value };
			  })
			: [],
		contactGroupMembership: memberships
			? memberships
					.filter((m) => {
						return m.contactGroupMembership;
					})
					.map(({ contactGroupMembership }) => {
						return contactGroupMap?.get(contactGroupMembership?.contactGroupResourceName!) ?? contactGroupMembership?.contactGroupResourceName;
					})
			: [],
		domainMembership: memberships
			? memberships
					.filter((m) => {
						return m.domainMembership;
					})
					.first()?.domainMembership?.inViewerDomain
			: false
	};
};

export const getPeopleService = async ({ credentials, token }: GoogleServiceOptions) => {
	const auth = await getAuthClient(credentials, token);

	return people({
		version: 'v1',
		auth
	});
};

export const searchContactsAndDirectory = async (
	query: string,
	options: QueryOptions
): Promise<PersonResult[] | undefined> => {
	let contacts = await searchContacts(query, options);
	const directory = await searchDirectory(query, options);
	if (directory) {
		contacts = contacts?.concat(directory)
	}
	return contacts
};

export const searchDirectory = async (
	query: string,
	{ service, accountName }: QueryOptions
): Promise<PersonResult[] | undefined> => {
	try {
		const response = await service.people.searchDirectoryPeople({
			query,
			readMask,
			sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT', 'DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE']
		});

		if (response.status !== 200) {
			console.warn(`error querying people api ${response.statusText}`);
			return;
		}
		if (!response.data?.people || response.data?.people?.length === 0) {
			return [];
		}

		return response.data.people.map((p): PersonResult => {
			return parsePersonData(p, 'DIRECTORY', accountName);
		});
	} catch (err: any) {
		console.error(`unable to query directory: ${err.message}`);
	}
};

export const searchContacts = async (
	query: string,
	{ service, accountName }: QueryOptions
): Promise<PersonResult[] | undefined> => {
	try {
		const response = await service.people.searchContacts({
			query,
			readMask,
			sources: ['READ_SOURCE_TYPE_CONTACT', 'READ_SOURCE_TYPE_PROFILE', 'READ_SOURCE_TYPE_DOMAIN_CONTACT']
		});

		if (response.status !== 200) {
			console.warn(`error querying people api ${response.statusText}`);
			return;
		}
		if (!response.data?.results || response.data?.results?.length === 0) {
			return [];
		}

		return response.data.results.map((p): PersonResult => {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			return parsePersonData(p.person!, 'CONTACTS', accountName);
		});
	} catch (err: any) {
		console.error(`unable to query contact: ${err.message}`);
	}
};

export const listContactGroups = async ({ service, accountName }: QueryOptions): Promise<people_v1.Schema$ContactGroup[] | undefined> => {
	try {
		const response = await service.contactGroups.list({
			pageSize: 1000,
		});

		if (response.status !== 200) {
			console.warn(`error querying people api ${response.statusText}`);
			return;
		}

		return response.data.contactGroups;
	} catch (err: any) {
		console.error(`unable to query contact groups: ${err.message}`);
	}
}

export const listContacts = async ({ service, accountName }: QueryOptions): Promise<people_v1.Schema$Person[] | undefined> => {	
	const contactGroups = await listContactGroups({ service, accountName });
	
	// Create a map of contact group resource names to contact group names
	const contactGroupMap = new Map<string, string>();
	contactGroups?.forEach((contactGroup) => {
		contactGroupMap.set(contactGroup.resourceName!, `contactGroups/${contactGroup.name!}`);
	});

	try {
		const response = await service.people.connections.list({
			resourceName: 'people/me',
			pageSize: 2000,
			personFields: 'names,nicknames,emailAddresses,phoneNumbers,biographies,calendarUrls,organizations,metadata,birthdays,urls,clientData,relations,userDefined,biographies,addresses,memberships',
		});

		if (response.status !== 200) {
			console.warn(`error querying people api ${response.statusText}`);
			return;
		}
		
		return response.data.connections?.map((p): PersonResult => {
			return parsePersonData(p, 'CONTACTS', accountName, contactGroupMap);
		});
	} catch (err: any) {
		console.error(`unable to query contacts: ${err.message}`);
	}
}

export const getAuthenticatedUserEmail = async ({ service }: QueryOptions): Promise<string | null | undefined> => {
	try {
		const response = await service.people.get({
			resourceName: 'people/me',
			personFields: 'names,nicknames,emailAddresses'
		});

		if (response.status !== 200) {
			console.warn(`error querying people api ${response.statusText}`);
			return;
		}

		return response.data.emailAddresses?.[0].value ?? 'unknown';
	} catch (err: any) {
		console.error(`unable to query authenticated user: ${err.message}`);
	}
};
