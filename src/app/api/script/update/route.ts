import { NextResponse } from "next/server";
import { Website } from "@/lib/schemas/website";
import connectDB from "@/lib/mongodb";

interface CrawlData {
	url: string;
	timestamp: Date;
	data: {
		title?: string;
		metaDescription?: string;
		redirects?: Array<{
			from: string;
			to: string;
			statusCode: number;
		}>;
		brokenLinks?: Array<{
			url: string;
			statusCode: number;
			text: string;
			sourceUrl: string;
		}>;
	};
}

export async function POST(req: Request) {
	try {
		console.log("[Update API] Received request");
		const body = await req.json();
		console.log("[Update API] Request body:", body);

		const { websiteId, url, type, value } = body;
		if (!websiteId || !url || !type || !value) {
			console.log("[Update API] Missing required fields");
			return new NextResponse("Missing required fields", {
				status: 400,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			});
		}

		// Get the scriptId from the authorization header
		const authHeader = req.headers.get("authorization");
		if (!authHeader) {
			console.log("[Update API] Missing authorization header");
			return new NextResponse("Missing authorization header", {
				status: 401,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			});
		}

		const scriptId = authHeader.replace("Bearer ", "");
		console.log("[Update API] Script ID:", scriptId);

		await connectDB();
		console.log("[Update API] Connected to MongoDB");

		const website = await Website.findOne({ _id: websiteId, scriptId });
		console.log("[Update API] Found website:", website ? "Yes" : "No");

		if (!website) {
			console.log("[Update API] Website not found or scriptId mismatch");
			return new NextResponse("Website not found or scriptId mismatch", {
				status: 404,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			});
		}

		// Find the crawl data entry for this URL
		const crawlDataIndex = website.crawlData.findIndex(
			(data: CrawlData) => data.url === url
		);

		if (crawlDataIndex === -1) {
			// If no crawl data exists for this URL, create a new entry
			website.crawlData.push({
				url,
				timestamp: new Date(),
				data: {
					[type]: value,
				},
			});
		} else {
			// Update the existing crawl data
			website.crawlData[crawlDataIndex].data[type] = value;
			website.crawlData[crawlDataIndex].timestamp = new Date();
		}

		await website.save();
		console.log("[Update API] Update saved successfully");

		return new NextResponse(JSON.stringify({ success: true }), {
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		});
	} catch (error) {
		console.error("[Update API] Error:", error);
		return new NextResponse("Internal Server Error", {
			status: 500,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		});
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
