import { Website } from "../schemas/website";
import { v4 as uuidv4 } from "uuid";

export class ScriptGeneratorService {
	constructor(private website: Website) {}

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
        `.trim();
	}
}
