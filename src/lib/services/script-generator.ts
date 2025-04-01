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

		// Generate the script tag with instructions
		return `<!-- Add this script tag in the <head> section of your HTML -->
<script defer src="${process.env.NEXT_PUBLIC_APP_URL}/api/script/${this.website.scriptId}"></script>`;
	}

	async generateScriptUrl(): Promise<string> {
		if (!this.website.scriptId) {
			this.website.scriptId = uuidv4();
			await this.website.save();
		}

		return `/api/script/${this.website.scriptId}`;
	}

	async validateScript(scriptId: string): Promise<boolean> {
		return this.website.scriptId === scriptId;
	}

	async getScriptContent(clientScript: string): Promise<string> {
		if (!this.website.scriptId) {
			throw new Error("Script ID not found");
		}

		// Create the initialization script with the API URL
		const initScript = `
// Initialize SeoBuddy configuration
window.seobuddy = {
	websiteId: '${this.website._id}',
	scriptId: '${this.website.scriptId}',
	apiUrl: '${process.env.NEXT_PUBLIC_APP_URL}'
};

// Load the client script
${clientScript}
`.trim();

		return initScript;
	}
}
