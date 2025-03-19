import { Website } from "../schemas/website";
import { v4 as uuidv4 } from "uuid";
import { Document } from "mongoose";

interface WebsiteDocument extends Document {
	_id: string;
	scriptId: string;
	userId: string;
	url: string;
	name: string;
	status: string;
	lastCrawl?: Date;
	issues?: Array<{
		type: string;
		description: string;
		severity: string;
		url?: string;
		timestamp?: Date;
	}>;
	crawlData?: Array<{
		url: string;
		timestamp: Date;
		data: any;
	}>;
	scriptTag?: string;
}

export class ScriptGeneratorService {
	constructor(private website: WebsiteDocument) {}

	async generateScript(): Promise<string> {
		// Generate a unique script ID if not exists
		if (!this.website.scriptId) {
			this.website.scriptId = uuidv4();
			await this.website.save();
		}

		// Generate the script content
		const script = `
            (function(w,d,s,o,f,js,fjs){
                w['SeoBuddy']=o;w[o]=w[o]||function(){
                    (w[o].q=w[o].q||[]).push(arguments)
                };
                js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
                js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
            }(window,document,'script','seobuddy','/api/script/${this.website.scriptId}.js'));

            seobuddy('init', {
                websiteId: '${this.website._id}',
                scriptId: '${this.website.scriptId}'
            });
        `.trim();

		return script;
	}

	async generateScriptUrl(): Promise<string> {
		if (!this.website.scriptId) {
			this.website.scriptId = uuidv4();
			await this.website.save();
		}

		return `/api/script/${this.website.scriptId}.js`;
	}

	async validateScript(scriptId: string): Promise<boolean> {
		return this.website.scriptId === scriptId;
	}

	async getScriptContent(): Promise<string> {
		if (!this.website.scriptId) {
			throw new Error("Script ID not found");
		}

		return `
            // SeoBuddy Client Script
            (function(w,d,s,o,f,js,fjs){
                w['SeoBuddy']=o;w[o]=w[o]||function(){
                    (w[o].q=w[o].q||[]).push(arguments)
                };
                js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
                js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
            }(window,document,'script','seobuddy','/api/script/${this.website.scriptId}.js'));

            // Initialize SeoBuddy
            seobuddy('init', {
                websiteId: '${this.website._id}',
                scriptId: '${this.website.scriptId}'
            });

            // Handle SEO issues
            seobuddy('onIssue', function(issue) {
                console.log('SeoBuddy Issue:', issue);
                // You can handle issues here
            });

            // Handle crawl requests
            seobuddy('onCrawl', function(data) {
                console.log('SeoBuddy Crawl:', data);
                // You can handle crawl data here
            });

            // Handle updates
            seobuddy('update', function(data) {
                console.log('SeoBuddy Update:', data);
                if (!data.url || !data.type || !data.value) {
                    console.error('Invalid update data:', data);
                    return;
                }

                // Send update event to server
                fetch('/api/script/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        websiteId: '${this.website._id}',
                        scriptId: '${this.website.scriptId}',
                        event: 'update',
                        data: {
                            url: data.url,
                            type: data.type,
                            value: data.value
                        }
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update');
                    }
                    console.log('Update successful');
                })
                .catch(error => {
                    console.error('Update failed:', error);
                });
            });

            // Function to update page title
            seobuddy('updateTitle', function(url, newTitle) {
                console.log('Updating title for:', url, 'to:', newTitle);
                seobuddy('update', {
                    url: url,
                    type: 'title',
                    value: newTitle
                });
            });

            // Function to update meta description
            seobuddy('updateMeta', function(url, newMeta) {
                console.log('Updating meta for:', url, 'to:', newMeta);
                seobuddy('update', {
                    url: url,
                    type: 'meta',
                    value: newMeta
                });
            });
        `.trim();
	}
}
