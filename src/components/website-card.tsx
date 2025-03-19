import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Globe, Activity, AlertCircle } from "lucide-react";

interface WebsiteCardProps {
	name: string;
	url: string;
	status: "active" | "inactive" | "error";
	lastCrawl: Date | null;
}

export function WebsiteCard({
	name,
	url,
	status,
	lastCrawl,
}: WebsiteCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Globe className="h-4 w-4" />
					{name}
				</CardTitle>
				<CardDescription>{url}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Activity className="h-4 w-4" />
					Last crawl:{" "}
					{lastCrawl ? new Date(lastCrawl).toLocaleDateString() : "Never"}
				</div>
				<div className="flex items-center gap-2 mt-2">
					<AlertCircle
						className={`h-4 w-4 ${
							status === "active"
								? "text-green-500"
								: status === "error"
								? "text-red-500"
								: "text-yellow-500"
						}`}
					/>
					<span className="text-sm capitalize">{status}</span>
				</div>
			</CardContent>
			<CardFooter className="flex justify-end gap-2">
				<Button variant="outline" size="sm">
					View Details
				</Button>
				<Button size="sm">Run Crawl</Button>
			</CardFooter>
		</Card>
	);
}
