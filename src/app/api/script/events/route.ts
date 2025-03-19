import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Website } from "@/lib/schemas/website";
import { ScriptGeneratorService } from "@/lib/services/script-generator";
import connectDB from "@/lib/mongodb";

export async function POST(req: Request) {
	try {
		console.log("[Script Events] Received event request");
		const { userId } = await auth();
		if (!userId) {
			console.log("[Script Events] Unauthorized - No userId found");
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { websiteId, scriptId, event, data } = await req.json();
		console.log("[Script Events] Event data:", {
			websiteId,
			scriptId,
			event,
			data,
		});

		if (!websiteId || !scriptId || !event) {
			console.log("[Script Events] Missing required fields");
			return new NextResponse("Missing required fields", { status: 400 });
		}

		// Connect to MongoDB
		await connectDB();
		console.log("[Script Events] Connected to MongoDB");

		// Find website
		const website = await Website.findOne({
			_id: websiteId,
			scriptId: scriptId,
			userId: userId,
		});
		console.log("[Script Events] Found website:", website ? "Yes" : "No");

		if (!website) {
			console.log("[Script Events] Website not found");
			return new NextResponse("Website not found", { status: 404 });
		}

		// Validate script
		const scriptGenerator = new ScriptGeneratorService(website);
		const isValid = await scriptGenerator.validateScript(scriptId);
		if (!isValid) {
			console.log("[Script Events] Invalid script");
			return new NextResponse("Invalid script", { status: 403 });
		}

		// Handle different event types
		switch (event) {
			case "issue":
				console.log("[Script Events] Handling issue event");
				// Store the issue in the database
				await website.updateOne({
					$push: {
						issues: {
							type: data.type,
							description: data.description,
							severity: data.severity,
							url: data.url,
							timestamp: new Date(),
						},
					},
				});
				break;

			case "crawl":
				console.log("[Script Events] Handling crawl event");
				// Store crawl data
				await website.updateOne({
					$push: {
						crawlData: {
							url: data.url,
							timestamp: new Date(),
							data: data,
						},
					},
				});
				break;

			case "update":
				console.log("[Script Events] Handling update event");
				if (!data.url || !data.type || !data.value) {
					console.log("[Script Events] Missing update data");
					return new NextResponse("Missing update data", { status: 400 });
				}

				// Update the specific field in crawlData
				const updateField =
					data.type === "title" ? "data.title" : "data.metaDescription";
				console.log("[Script Events] Updating field:", updateField);

				const result = await website.updateOne(
					{
						"crawlData.url": data.url,
					},
					{
						$set: {
							[`crawlData.$.${updateField}`]: data.value,
						},
					}
				);
				console.log("[Script Events] Update result:", result);
				break;

			default:
				console.log("[Script Events] Invalid event type:", event);
				return new NextResponse("Invalid event type", { status: 400 });
		}

		console.log("[Script Events] Event processed successfully");
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[Script Events] Error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
