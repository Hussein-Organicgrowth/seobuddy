import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Website } from "@/lib/schemas/website";
import { ScriptGeneratorService } from "@/lib/services/script-generator";
import connectDB from "@/lib/mongodb";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const websiteSchema = z.object({
	name: z.string().min(1, "Name is required"),
	url: z.string().url("Invalid URL format"),
});

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const body = await req.json();
		const validatedData = websiteSchema.safeParse(body);

		if (!validatedData.success) {
			return NextResponse.json(
				{ errors: validatedData.error.flatten().fieldErrors },
				{ status: 400 }
			);
		}

		const { name, url } = validatedData.data;

		await connectDB();

		const scriptId = uuidv4();
		const scriptKey = uuidv4();

		const website = await Website.create({
			name,
			url,
			userId,
			scriptId,
			scriptKey,
			status: "active",
		});

		const scriptGenerator = new ScriptGeneratorService(website);
		const scriptContent = await scriptGenerator.getScriptContent();

		// Update the website with the script content
		website.scriptTag = scriptContent;
		await website.save();

		return NextResponse.json(website);
	} catch (error) {
		console.error("Website creation error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}

export async function GET(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		await connectDB();

		const websites = await Website.find({ userId }).sort({ updatedAt: -1 });

		return NextResponse.json(websites);
	} catch (error) {
		console.error("Error fetching websites:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
