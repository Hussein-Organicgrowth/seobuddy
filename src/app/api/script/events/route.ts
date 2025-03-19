import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Website } from "@/lib/schemas/website";
import { ScriptGeneratorService } from "@/lib/services/script-generator";
import connectDB from "@/lib/mongodb";

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { websiteId, scriptId, event, data } = await req.json();

		if (!websiteId || !scriptId || !event) {
			return new NextResponse("Missing required fields", { status: 400 });
		}

		// Connect to MongoDB
		await connectDB();

		// Find website
		const website = await Website.findOne({
			_id: websiteId,
			scriptId: scriptId,
			userId: userId,
		});

		if (!website) {
			return new NextResponse("Website not found", { status: 404 });
		}

		// Validate script
		const scriptGenerator = new ScriptGeneratorService(website);
		const isValid = await scriptGenerator.validateScript(scriptId);
		if (!isValid) {
			return new NextResponse("Invalid script", { status: 403 });
		}

		// Handle different event types
		switch (event) {
			case "issue":
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

			default:
				return new NextResponse("Invalid event type", { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Script event error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
