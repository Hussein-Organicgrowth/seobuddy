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

// Helper function to serialize MongoDB document
function serializeCrawlData(data: any): CrawlData {
	return {
		url: data.url,
		timestamp:
			data.timestamp instanceof Date
				? data.timestamp.toISOString()
				: data.timestamp,
		data: {
			title: data.data?.title,
			metaDescription: data.data?.metaDescription,
			redirects: data.data?.redirects || [],
			brokenLinks: data.data?.brokenLinks || [],
		},
	};
}

export async function GET(
	request: Request,
	{ params }: { params: { scriptId: string } }
) {
	try {
		const { searchParams } = new URL(request.url);
		const url = searchParams.get("url");
		const scriptId = await params.scriptId;

		await connectDB();

		const website = await Website.findOne({ scriptId });

		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		if (url) {
			// If URL is provided, return only the most recent crawl data for that URL
			const crawlData = website.crawlData
				.filter((data: CrawlData) => data.url === url)
				.sort(
					(a: CrawlData, b: CrawlData) =>
						new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				)[0];

			return NextResponse.json(serializeCrawlData(crawlData));
		} else {
			// If no URL is provided, return all crawl data sorted by timestamp
			const allCrawlData = website.crawlData.sort(
				(a: CrawlData, b: CrawlData) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			);

			return NextResponse.json(allCrawlData.map(serializeCrawlData));
		}
	} catch (error) {
		console.error("Error fetching crawl data:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function POST(
	request: Request,
	{ params }: { params: { scriptId: string } }
) {
	try {
		const body = await request.json();
		const { url, data } = body;
		const scriptId = await params.scriptId;

		if (!url || !data) {
			return NextResponse.json(
				{ error: "URL and data are required" },
				{ status: 400 }
			);
		}

		await connectDB();

		const website = await Website.findOne({ scriptId });

		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		// Find existing crawl data for this URL
		const existingDataIndex = website.crawlData.findIndex(
			(item: CrawlData) => item.url === url
		);

		if (existingDataIndex !== -1) {
			// Get the existing data
			const existingData = website.crawlData[existingDataIndex];

			// Create a new data object that preserves all existing fields
			const updatedData = {
				url: existingData.url, // Preserve the URL
				timestamp: new Date(),
				data: {
					...existingData.data, // Keep all existing data fields
					...data, // Override only the fields that are provided
				},
			};

			// Update the crawl data array
			website.crawlData[existingDataIndex] = updatedData;
		} else {
			// Create new crawl data entry with complete data structure
			website.crawlData.push({
				url,
				timestamp: new Date(),
				data: {
					title: data.title || "",
					metaDescription: data.metaDescription || "",
					redirects: data.redirects || [],
					brokenLinks: data.brokenLinks || [],
				},
			});
		}

		await website.save();

		// Return the updated data
		const updatedWebsite = await Website.findOne({ scriptId });
		const updatedData = updatedWebsite.crawlData.find(
			(item: CrawlData) => item.url === url
		);

		return NextResponse.json(serializeCrawlData(updatedData));
	} catch (error) {
		console.error("Error updating crawl data:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function OPTIONS(request: Request) {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
