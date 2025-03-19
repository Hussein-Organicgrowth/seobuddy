import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Website } from "@/lib/schemas/website";
import connectDB from "@/lib/mongodb";

export async function GET(
	req: Request,
	{ params }: { params: { scriptId: string } }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Connect to MongoDB
		await connectDB();

		// Find website by scriptId
		const website = await Website.findOne({
			scriptId: params.scriptId,
			userId: userId,
		});

		if (!website) {
			return new NextResponse("Script not found", { status: 404 });
		}

		// Set the content type to JavaScript
		return new NextResponse(website.scriptTag, {
			headers: {
				"Content-Type": "application/javascript",
			},
		});
	} catch (error) {
		console.error("Error serving script:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
