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
		console.log("[Updates API] Received request for updates");
		await connectDB();
		console.log("[Updates API] Connected to MongoDB");

		const website = await Website.findOne({ scriptId: params.scriptId });
		console.log("[Updates API] Found website:", website ? "Yes" : "No");

		if (!website) {
			console.log("[Updates API] Website not found");
			return new NextResponse("Website not found", { status: 404 });
		}

		// Get pending updates for the current URL
		const url = new URL(req.url).searchParams.get("url");
		if (!url) {
			return new NextResponse("URL parameter is required", { status: 400 });
		}

		const pendingUpdates =
			website.pendingUpdates?.filter(
				(update: PendingUpdate) => update.url === url && !update.applied
			) || [];

		// Mark updates as applied
		if (pendingUpdates.length > 0) {
			await Website.updateOne(
				{
					_id: website._id,
					"pendingUpdates.url": url,
					"pendingUpdates.applied": false,
				},
				{
					$set: { "pendingUpdates.$.applied": true },
				}
			);
		}

		return NextResponse.json({ updates: pendingUpdates });
	} catch (error) {
		console.error("[Updates API] Error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
