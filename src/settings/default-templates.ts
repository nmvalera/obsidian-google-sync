export const DEFAULT_PERSON_FILENAME_FORMAT = '{{lastname}}, {{firstname}}';

export const DEFAULT_PERSON_TEMPLATE = `
---
aliases: ["{{lastfirst}}", "{{firstlast}}", "{{firstname}}.{{lastname}}", {{emails}}]
created: ["{{date}} {{time}}"]
---
# {{firstname}} {{lastname}}
#person #person/{{source}}

{{org.title}} {{org.department}}

----

## Contact Info

Email: {{emails}}
Phone: {{phones}}

[open in Google Contacts]({{link}})


----

## Log

### [[{{date}}]] {{time}} - Created

`;
export const DEFAULT_EVENT_TEMPLATE = `
{{ event }}
`;
