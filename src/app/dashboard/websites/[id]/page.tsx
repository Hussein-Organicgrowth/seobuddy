import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { WebsiteDetailsForm } from "@/components/dashboard/website-details-form";
import { Website } from "@/lib/schemas/website";
import connectDB from "@/lib/mongodb";
import { Types } from "mongoose";

interface PageProps {
	params: {
		id: string;
	};
}

interface WebsiteData {
	_id: string;
	name: string;
	url: string;
	status: "active" | "inactive" | "error";
	lastCrawl?: Date;
	issues?: Array<{
		type: string;
		message: string;
		severity: "error" | "warning" | "info";
	}>;
	scriptTag?: string;
	scriptId: string;
}

interface WebsiteDocument {
	_id: Types.ObjectId;
	name: string;
	url: string;
	status: "active" | "inactive" | "error";
	lastCrawl?: Date;
	issues?: Array<{
		type: string;
		message: string;
		severity: "error" | "warning" | "info";
	}>;
	crawlData?: Array<{
		url: string;
		timestamp: Date;
		data: {
			title?: string;
			metaDescription?: string;
			redirects?: Array<{
				from: string;
				to: string;
				statusCode: number;
			}>;
			brokenLinks?: Array<{
				url: string;
				statusCode: number;
				text: string;
				sourceUrl: string;
			}>;
		};
	}>;
	scriptTag?: string;
	scriptId: string;
}

async function getWebsite(
	id: string,
	userId: string
): Promise<WebsiteData | null> {
	try {
		await connectDB();
		const website = (await Website.findOne({
			_id: id,
			userId: userId,
		}).lean()) as WebsiteDocument | null;

		if (!website) {
			return null;
		}

		// Convert MongoDB document to plain object with proper typing
		return {
			_id: website._id.toString(),
			name: website.name,
			url: website.url,
			status: website.status,
			lastCrawl: website.lastCrawl ? new Date(website.lastCrawl) : undefined,
			crawlData: website.crawlData,
			issues: website.issues,
			scriptTag: website.scriptTag,
			scriptId: website.scriptId,
		};
	} catch (error) {
		console.error("Error fetching website:", error);
		return null;
	}
}

export default async function WebsiteDetailsPage({ params }: PageProps) {
	const { userId } = await auth();
	if (!userId) {
		redirect("/sign-in");
	}

	const website = await getWebsite(params.id, userId);

	if (!website) {
		redirect("/dashboard");
	}

	return (
		<DashboardShell>
			<DashboardHeader
				heading={website.name}
				text={`Manage and monitor your website's SEO performance.`}
			/>
			<WebsiteDetailsForm website={website} />
		</DashboardShell>
	);
}
