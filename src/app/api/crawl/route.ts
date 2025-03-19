import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CrawlerService } from "@/lib/services/crawler";
import { Website } from "@/lib/schemas/website";
import connectDB from "@/lib/mongodb";

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { websiteId } = await req.json();
		if (!websiteId) {
			return new NextResponse("Website ID is required", { status: 400 });
		}

		// Connect to MongoDB
		await connectDB();

		// Get website details
		const website = await Website.findOne({
			_id: websiteId,
			userId: userId,
		});

		if (!website) {
			return new NextResponse("Website not found", { status: 404 });
		}

		// Create a TransformStream to handle progress updates
		const stream = new TransformStream();
		const writer = stream.writable.getWriter();
		const encoder = new TextEncoder();

		// Start crawling in the background
		const crawler = new CrawlerService(website);
		crawler
			.crawl({
				maxPages: 500,
				maxDepth: 5,
				rateLimit: 500,
				onProgress: async (progress) => {
					await writer.write(
						encoder.encode(
							JSON.stringify({
								type: "progress",
								...progress,
							}) + "\n"
						)
					);
				},
			})
			.then(async (result) => {
				// Send completion data
				await writer.write(
					encoder.encode(
						JSON.stringify({
							type: "complete",
							pages: result.pages,
							redirects: result.redirects,
							brokenLinks: result.brokenLinks,
							stats: result.stats,
						}) + "\n"
					)
				);
				await writer.close();
			})
			.catch(async (error) => {
				console.error("Error in crawler:", error);
				await writer.write(
					encoder.encode(
						JSON.stringify({
							type: "error",
							message: error.message,
						}) + "\n"
					)
				);
				await writer.close();
			});

		// Return the readable stream
		return new Response(stream.readable, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error in crawl route:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
