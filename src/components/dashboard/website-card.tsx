import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Website } from "@/lib/schemas/website";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle2, Clock, LucideIcon } from "lucide-react";
import { Document } from "mongoose";

interface WebsiteDocument extends Document {
	name: string;
	url: string;
	status: "active" | "inactive" | "error";
	lastCrawl?: Date;
	issues?: Array<{
		type: string;
		description: string;
		severity: "low" | "medium" | "high";
	}>;
}

interface WebsiteCardProps {
	website: WebsiteDocument;
}

export function WebsiteCard({ website }: WebsiteCardProps) {
	const statusColor = {
		active: "bg-green-500",
		inactive: "bg-yellow-500",
		error: "bg-red-500",
	}[website.status];

	const statusIcon = {
		active: CheckCircle2,
		inactive: Clock,
		error: AlertCircle,
	}[website.status];

	const StatusIcon = statusIcon;

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{website.name}</CardTitle>
				<Badge variant="outline" className="flex items-center gap-1">
					<StatusIcon className="h-3 w-3" />
					<span className="capitalize">{website.status}</span>
				</Badge>
			</CardHeader>
			<CardContent>
				<div className="text-xs text-muted-foreground mb-4">{website.url}</div>
				<div className="flex flex-col gap-2">
					<div className="text-xs text-muted-foreground">
						Last crawl:{" "}
						{website.lastCrawl
							? formatDistanceToNow(website.lastCrawl, {
									addSuffix: true,
							  })
							: "Never"}
					</div>
					<div className="text-xs text-muted-foreground">
						Issues: {website.issues?.length || 0}
					</div>
					<Button variant="outline" className="w-full" asChild>
						<Link href={`/dashboard/websites/${website._id}`}>
							View Details
						</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
