import { NextResponse } from "next/server";
import { Website } from "@/lib/schemas/website";
import connectDB from "@/lib/mongodb";

interface PendingUpdate {
	url: string;
	type: "title" | "meta";
	value: string;
	timestamp: Date;
	applied: boolean;
}

export async function GET(
	req: Request,
	{ params }: { params: { scriptId: string } }
) {
	try {
		console.log("[Updates API] Received request for script:", params.scriptId);
		await connectDB();
		console.log("[Updates API] Connected to MongoDB");

		const website = await Website.findOne({ scriptId: params.scriptId });
		console.log("[Updates API] Found website:", website ? "Yes" : "No");

		if (!website) {
			console.log("[Updates API] Website not found");
			return new NextResponse("Website not found", { status: 404 });
		}

		// Get the URL from query parameters
		const url = new URL(req.url).searchParams.get("url");
		if (!url) {
			console.log("[Updates API] Missing URL parameter");
			return new NextResponse("Missing URL parameter", { status: 400 });
		}

		// Find pending updates for this URL
		const pendingUpdates =
			website.pendingUpdates?.filter(
				(update: PendingUpdate) => update.url === url && !update.applied
			) || [];

		console.log("[Updates API] Found pending updates:", pendingUpdates.length);

		// Mark updates as applied
		if (pendingUpdates.length > 0) {
			website.pendingUpdates = website.pendingUpdates.map(
				(update: PendingUpdate) => {
					if (update.url === url && !update.applied) {
						return { ...update, applied: true };
					}
					return update;
				}
			);
			await website.save();
		}

		return new NextResponse(JSON.stringify(pendingUpdates), {
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		});
	} catch (error) {
		console.error("[Updates API] Error:", error);
		return new NextResponse("Internal Server Error", {
			status: 500,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		});
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
