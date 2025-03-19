import { UserButton } from "@clerk/nextjs";
import { MainNav } from "@/components/dashboard/main-nav";
import { DashboardShell } from "@/components/dashboard/shell";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-14 items-center">
					<MainNav />
					<div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
						<div className="w-full flex-1 md:w-auto md:flex-none">
							{/* Add search here if needed */}
						</div>
						<UserButton afterSignOutUrl="/" />
					</div>
				</div>
			</header>
			<div className="flex-1">
				<DashboardShell>{children}</DashboardShell>
			</div>
		</div>
	);
}
