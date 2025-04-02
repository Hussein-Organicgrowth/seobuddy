"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit2, ExternalLink, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CrawlData {
	url: string;
	timestamp: string | Date;
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
}

interface CrawlDataViewProps {
	websiteId: string;
	scriptId: string;
	crawlData: CrawlData[];
}

export function CrawlDataView({
	websiteId,
	scriptId,
	crawlData: initialCrawlData,
}: CrawlDataViewProps) {
	const [activeTab, setActiveTab] = useState("titles");
	const [editingTitle, setEditingTitle] = useState<{
		url: string;
		title: string;
	} | null>(null);
	const [editingMeta, setEditingMeta] = useState<{
		url: string;
		meta: string;
	} | null>(null);
	const [newTitle, setNewTitle] = useState("");
	const [newMeta, setNewMeta] = useState("");
	const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false);
	const [isMetaDialogOpen, setIsMetaDialogOpen] = useState(false);
	const [crawlData, setCrawlData] = useState<CrawlData[]>(initialCrawlData);
	const { toast } = useToast();

	// Function to fetch the latest crawl data
	const fetchLatestCrawlData = async () => {
		try {
			const response = await fetch(`/api/script/${scriptId}/crawl-data`);
			if (!response.ok) throw new Error("Failed to fetch crawl data");
			const data = await response.json();
			setCrawlData(data);
		} catch (error) {
			console.error("Error fetching crawl data:", error);
		}
	};

	// Fetch latest data periodically
	useEffect(() => {
		const interval = setInterval(fetchLatestCrawlData, 30000); // Fetch every 30 seconds
		return () => clearInterval(interval);
	}, [scriptId]);

	const handleTitleUpdate = async () => {
		if (!editingTitle) return;

		try {
			const response = await fetch(`/api/script/${scriptId}/crawl-data`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					url: editingTitle.url,
					data: {
						title: newTitle,
					},
				}),
			});

			if (!response.ok) throw new Error("Failed to update title");

			// Fetch the latest data after update
			await fetchLatestCrawlData();

			toast({
				title: "Title Updated",
				description: "The page title has been updated successfully.",
			});
			setEditingTitle(null);
			setIsTitleDialogOpen(false);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to update the title. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleMetaUpdate = async () => {
		if (!editingMeta) return;

		try {
			const response = await fetch(`/api/script/${scriptId}/crawl-data`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					url: editingMeta.url,
					data: {
						metaDescription: newMeta,
					},
				}),
			});

			if (!response.ok) throw new Error("Failed to update meta description");

			// Fetch the latest data after update
			await fetchLatestCrawlData();

			toast({
				title: "Meta Description Updated",
				description: "The meta description has been updated successfully.",
			});
			setEditingMeta(null);
			setIsMetaDialogOpen(false);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to update the meta description. Please try again.",
				variant: "destructive",
			});
		}
	};

	const openTitleDialog = (url: string, title: string) => {
		setEditingTitle({ url, title });
		setNewTitle(title);
		setIsTitleDialogOpen(true);
	};

	const openMetaDialog = (url: string, meta: string) => {
		setEditingMeta({ url, meta });
		setNewMeta(meta);
		setIsMetaDialogOpen(true);
	};

	return (
		<Card className="p-6">
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="titles">Page Titles</TabsTrigger>
					<TabsTrigger value="meta">Meta Descriptions</TabsTrigger>
					<TabsTrigger value="redirects">Redirects</TabsTrigger>
					<TabsTrigger value="broken">Broken Links</TabsTrigger>
				</TabsList>

				<TabsContent value="titles">
					<ScrollArea className="h-[400px]">
						<div className="space-y-4">
							{crawlData.map((data, index) => (
								<div
									key={index}
									className="flex items-center justify-between rounded-lg border p-4">
									<div className="space-y-1">
										<p className="text-sm font-medium">
											{data.data.title || "No title"}
										</p>
										<p className="text-xs text-muted-foreground">{data.url}</p>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() =>
											openTitleDialog(data.url, data.data.title || "")
										}>
										<Edit2 className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					</ScrollArea>
				</TabsContent>

				<TabsContent value="meta">
					<ScrollArea className="h-[400px]">
						<div className="space-y-4">
							{crawlData.map((data, index) => (
								<div
									key={index}
									className="flex items-center justify-between rounded-lg border p-4">
									<div className="space-y-1">
										<p className="text-sm font-medium">
											{data.data.metaDescription || "No meta description"}
										</p>
										<p className="text-xs text-muted-foreground">{data.url}</p>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() =>
											openMetaDialog(data.url, data.data.metaDescription || "")
										}>
										<Edit2 className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					</ScrollArea>
				</TabsContent>

				<TabsContent value="redirects">
					<ScrollArea className="h-[400px]">
						<div className="space-y-4">
							{crawlData.map((data, index) => (
								<div key={index}>
									{data.data.redirects?.map((redirect, redirectIndex) => (
										<div
											key={redirectIndex}
											className="flex items-center justify-between rounded-lg border p-4">
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<Badge variant="secondary">
														{redirect.statusCode}
													</Badge>
													<p className="text-sm font-medium">{redirect.from}</p>
												</div>
												<p className="text-xs text-muted-foreground">
													Redirects to: {redirect.to}
												</p>
											</div>
											<Button variant="ghost" size="icon" asChild>
												<a
													href={redirect.from}
													target="_blank"
													rel="noopener noreferrer">
													<ExternalLink className="h-4 w-4" />
												</a>
											</Button>
										</div>
									))}
								</div>
							))}
						</div>
					</ScrollArea>
				</TabsContent>

				<TabsContent value="broken">
					<ScrollArea className="h-[400px]">
						<div className="space-y-4">
							{crawlData.map((data, index) => (
								<div key={index}>
									{data.data.brokenLinks?.map((link, linkIndex) => (
										<div
											key={linkIndex}
											className="flex items-center justify-between rounded-lg border p-4">
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<Badge variant="destructive">{link.statusCode}</Badge>
													<p className="text-sm font-medium">{link.url}</p>
												</div>
												<p className="text-xs text-muted-foreground">
													Found on: {link.sourceUrl}
												</p>
												<p className="text-xs text-muted-foreground">
													Link text: {link.text}
												</p>
											</div>
											<Button variant="ghost" size="icon" asChild>
												<a
													href={link.url}
													target="_blank"
													rel="noopener noreferrer">
													<ExternalLink className="h-4 w-4" />
												</a>
											</Button>
										</div>
									))}
								</div>
							))}
						</div>
					</ScrollArea>
				</TabsContent>
			</Tabs>

			<Dialog open={isTitleDialogOpen} onOpenChange={setIsTitleDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Page Title</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<Input
							placeholder="Enter new title"
							value={newTitle}
							onChange={(e) => setNewTitle(e.target.value)}
						/>
						<Button onClick={handleTitleUpdate}>Update Title</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={isMetaDialogOpen} onOpenChange={setIsMetaDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Meta Description</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<Input
							placeholder="Enter new meta description"
							value={newMeta}
							onChange={(e) => setNewMeta(e.target.value)}
						/>
						<Button onClick={handleMetaUpdate}>Update Meta Description</Button>
					</div>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
