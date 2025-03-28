import { NextResponse } from "next/server";
import { Website } from "@/lib/schemas/website";
import connectDB from "@/lib/mongodb";
import { ScriptGeneratorService } from "@/lib/services/script-generator";

export async function GET(
	req: Request,
	{ params }: { params: { scriptId: string } }
) {
	try {
		console.log("[Script API] Received request for script:", params.scriptId);
		await connectDB();
		console.log("[Script API] Connected to MongoDB");

		const website = await Website.findOne({ scriptId: params.scriptId });
		console.log("[Script API] Found website:", website ? "Yes" : "No");

		if (!website) {
			console.log("[Script API] Website not found");
			return new NextResponse("Website not found", { status: 404 });
		}

		const scriptGenerator = new ScriptGeneratorService(website);
		const scriptContent = await scriptGenerator.getScriptContent();
		console.log("[Script API] Generated script content");

		return new NextResponse(scriptContent, {
			headers: {
				"Content-Type": "application/javascript",
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
				Expires: "0",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		});
	} catch (error) {
		console.error("[Script API] Error:", error);
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
