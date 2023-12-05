export type GoogleLookupPluginSettings = {
	contacts_activated: boolean;
	contacts_template_file: string;
	contacts_folder: string;
	contacts_filename_format: string;
	
	events_activated: boolean;
	events_template_file: string;
	events_folder: string;
	events_default_name: string;
	
	client_id: string;
	client_secret: string;
	client_redirect_uri_port: string;
};
