import { NextResponse } from "next/server";
import { Website } from "@/lib/schemas/website";
import connectDB from "@/lib/mongodb";

export async function POST(req: Request) {
	try {
		console.log("[Update API] Received update request");
		const { websiteId, url, type, value } = await req.json();
		console.log("[Update API] Request data:", { websiteId, url, type, value });

		if (!websiteId || !url || !type || !value) {
			console.log("[Update API] Missing required fields");
			return new NextResponse("Missing required fields", { status: 400 });
		}

		// Connect to MongoDB
		await connectDB();
		console.log("[Update API] Connected to MongoDB");

		// Find website
		const website = await Website.findOne({
			_id: websiteId,
		});
		console.log("[Update API] Found website:", website ? "Yes" : "No");

		if (!website) {
			console.log("[Update API] Website not found");
			return new NextResponse("Website not found", { status: 404 });
		}

		// Update the crawl data with the new value
		const updateField =
			type === "title" ? "data.title" : "data.metaDescription";
		console.log("[Update API] Updating field:", updateField);

		const result = await Website.updateOne(
			{
				_id: websiteId,
				"crawlData.url": url,
			},
			{
				$set: {
					[`crawlData.$.${updateField}`]: value,
				},
			}
		);
		console.log("[Update API] Update result:", result);

		// Update lastCrawl timestamp to indicate a change
		await Website.updateOne(
			{ _id: websiteId },
			{ $set: { lastCrawl: new Date() } }
		);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[Update API] Error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
