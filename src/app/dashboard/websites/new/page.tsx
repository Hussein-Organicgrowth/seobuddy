import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { AddWebsiteForm } from "@/components/dashboard/add-website-form";

export default async function NewWebsitePage() {
	const { userId } = await auth();
	if (!userId) {
		redirect("/sign-in");
	}

	return (
		<DashboardShell>
			<DashboardHeader
				heading="Add Website"
				text="Add a new website to monitor its SEO performance."
			/>
			<div className="grid gap-8">
				<AddWebsiteForm />
			</div>
		</DashboardShell>
	);
}
