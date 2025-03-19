import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Website } from "@/lib/schemas/website";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { WebsiteCard } from "@/components/dashboard/website-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import connectDB from "@/lib/mongodb";

export default async function DashboardPage() {
	const { userId } = await auth();

	if (!userId) {
		redirect("/sign-in");
	}

	await connectDB();

	const websites = await Website.find({ userId }).sort({ updatedAt: -1 });

	return (
		<DashboardShell>
			<DashboardHeader
				heading="Dashboard"
				text="Overview of your websites and their SEO status.">
				<Button asChild>
					<Link href="/dashboard/websites/new">Add Website</Link>
				</Button>
			</DashboardHeader>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{websites.map((website) => (
					<WebsiteCard key={website._id} website={website} />
				))}
			</div>
		</DashboardShell>
	);
}
