"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const items = [
	{
		title: "Overview",
		href: "/dashboard",
	},
	{
		title: "Websites",
		href: "/dashboard/websites",
	},
	{
		title: "Issues",
		href: "/dashboard/issues",
	},
	{
		title: "Settings",
		href: "/dashboard/settings",
	},
];

export function MainNav() {
	const pathname = usePathname();

	return (
		<ScrollArea className="flex max-w-[600px] lg:max-w-[800px]">
			<div className="flex items-center space-x-4 p-4">
				{items.map((item) => (
					<Button
						key={item.href}
						variant={pathname === item.href ? "secondary" : "ghost"}
						className={cn(
							"justify-start",
							pathname === item.href && "bg-muted font-medium"
						)}
						asChild>
						<Link href={item.href}>{item.title}</Link>
					</Button>
				))}
			</div>
			<ScrollBar orientation="horizontal" className="invisible" />
		</ScrollArea>
	);
}
