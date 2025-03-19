import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Website } from "@/lib/schemas/website";
import connectDB from "@/lib/mongodb";

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { websiteId, url, type, value } = await req.json();

		if (!websiteId || !url || !type || !value) {
			return new NextResponse("Missing required fields", { status: 400 });
		}

		// Connect to MongoDB
		await connectDB();

		// Find website
		const website = await Website.findOne({
			_id: websiteId,
			userId: userId,
		});

		if (!website) {
			return new NextResponse("Website not found", { status: 404 });
		}

		// Update the crawl data with the new value
		const updateField =
			type === "title" ? "data.title" : "data.metaDescription";

		await Website.updateOne(
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

		// Trigger a script update event
		await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/script/events`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				websiteId,
				scriptId: website.scriptId,
				event: "update",
				data: {
					url,
					type,
					value,
				},
			}),
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Update error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
