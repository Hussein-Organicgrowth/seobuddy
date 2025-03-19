import { NextResponse } from "next/server";
import { Website } from "@/lib/schemas/website";
import connectDB from "@/lib/mongodb";

export async function POST(req: Request) {
	try {
		console.log("[Update API] Received update request");
		const { websiteId, url, type, value } = await req.json();
		console.log("[Update API] Request data:", { websiteId, url, type, value });

		// Get the scriptId from the Authorization header
		const authHeader = req.headers.get("authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			console.log("[Update API] Missing or invalid authorization header");
			return new NextResponse("Unauthorized", { status: 401 });
		}
		const scriptId = authHeader.split(" ")[1];

		if (!websiteId || !url || !type || !value) {
			console.log("[Update API] Missing required fields");
			return new NextResponse("Missing required fields", { status: 400 });
		}

		// Connect to MongoDB
		await connectDB();
		console.log("[Update API] Connected to MongoDB");

		// Find website and verify scriptId matches
		const website = await Website.findOne({
			_id: websiteId,
			scriptId: scriptId,
		});
		console.log("[Update API] Found website:", website ? "Yes" : "No");

		if (!website) {
			console.log("[Update API] Website not found or scriptId mismatch");
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Store the update in pendingUpdates array
		const result = await Website.updateOne(
			{ _id: websiteId },
			{
				$push: {
					pendingUpdates: {
						url,
						type,
						value,
						timestamp: new Date(),
						applied: false,
					},
				},
			}
		);
		console.log("[Update API] Update stored:", result);

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
