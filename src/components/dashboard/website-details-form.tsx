"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Play, FileCode, Copy } from "lucide-react";
import { CrawlDataView } from "./crawl-data-view";
import { ScriptGeneratorService } from "@/lib/services/script-generator";
import { Website } from "@/lib/schemas/website";

interface WebsiteDetailsFormProps {
	website: {
		_id: string;
		name: string;
		url: string;
		status: "active" | "inactive" | "error";
		lastCrawl?: Date;
		issues?: Array<{
			type: string;
			description: string;
			severity: "error" | "warning" | "info";
		}>;
		scriptTag?: string;
		scriptId: string;
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
	};
}

interface CrawlResult {
	pages: Array<{
		url: string;
		title: string;
		metaDescription: string;
		h1Tags: string[];
		canonicalUrl?: string;
		robotsMeta?: string;
	}>;
	redirects: Array<{
		from: string;
		to: string;
		statusCode: number;
	}>;
	brokenLinks: Array<{
		url: string;
		statusCode: number;
		text: string;
		sourceUrl: string;
	}>;
	stats: {
		totalPages: number;
		startTime: Date;
		endTime: Date;
	};
}

interface CrawlProgress {
	currentPage: number;
	totalPages: number;
	currentUrl: string;
	status: string;
	discoveredLinks: number;
}

interface CrawlProgressData {
	type: "progress" | "complete" | "error";
	currentPage?: number;
	totalPages?: number;
	currentUrl?: string;
	status?: string;
	discoveredLinks?: number;
	pages?: Array<{
		url: string;
		title: string;
		metaDescription: string;
		h1Tags: string[];
		canonicalUrl?: string;
		robotsMeta?: string;
	}>;
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
	stats?: {
		totalPages: number;
		startTime: Date;
		endTime: Date;
	};
	message?: string;
}

export function WebsiteDetailsForm({ website }: WebsiteDetailsFormProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [showScript, setShowScript] = useState(false);
	const [crawlProgress, setCrawlProgress] = useState<CrawlProgress | null>(
		null
	);
	const [scriptContent, setScriptContent] = useState<string>("");
	const { toast } = useToast();

	// Serialize the crawl data
	const serializedCrawlData = website.crawlData?.map((data) => ({
		url: data.url,
		timestamp:
			data.timestamp instanceof Date
				? data.timestamp.toISOString()
				: data.timestamp,
		data: {
			title: data.data.title,
			metaDescription: data.data.metaDescription,
			redirects: data.data.redirects,
			brokenLinks: data.data.brokenLinks,
		},
	}));

	useEffect(() => {
		const generateScript = async () => {
			try {
				const scriptGenerator = new ScriptGeneratorService(website as any);
				const content = await scriptGenerator.generateScript();
				setScriptContent(content);
			} catch (error) {
				console.error("Error generating script:", error);
				toast({
					title: "Error",
					description: "Failed to generate script content.",
					variant: "destructive",
				});
			}
		};

		generateScript();
	}, [website, toast]);

	const handleCrawl = async () => {
		try {
			setIsLoading(true);
			setCrawlProgress({
				currentPage: 0,
				totalPages: 1,
				currentUrl: website.url,
				status: "Starting crawl...",
				discoveredLinks: 0,
			});

			const response = await fetch("/api/crawl", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ websiteId: website._id }),
			});

			if (!response.ok) {
				throw new Error("Failed to start crawl");
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("Failed to get response reader");
			}

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const text = new TextDecoder().decode(value);
				const lines = text.split("\n").filter((line) => line.trim());

				for (const line of lines) {
					try {
						const data = JSON.parse(line) as CrawlProgressData;
						if (
							data.type === "progress" &&
							data.currentPage !== undefined &&
							data.totalPages !== undefined &&
							data.currentUrl !== undefined &&
							data.status !== undefined &&
							data.discoveredLinks !== undefined
						) {
							setCrawlProgress({
								currentPage: data.currentPage,
								totalPages: data.totalPages,
								currentUrl: data.currentUrl,
								status: data.status,
								discoveredLinks: data.discoveredLinks,
							});
						} else if (
							data.type === "complete" &&
							data.pages &&
							data.redirects &&
							data.brokenLinks &&
							data.stats
						) {
							// Update the website data with new crawl data
							website.crawlData = data.pages.map((page) => ({
								url: page.url,
								timestamp: new Date(),
								data: {
									title: page.title,
									metaDescription: page.metaDescription,
									redirects:
										data.redirects?.filter((r) => r.from === page.url) || [],
									brokenLinks:
										data.brokenLinks?.filter((b) => b.sourceUrl === page.url) ||
										[],
								},
							}));

							toast({
								title: "Crawl completed",
								description: `Successfully crawled ${data.stats.totalPages} pages.`,
							});
						} else if (data.type === "error" && data.message) {
							throw new Error(data.message);
						}
					} catch (e) {
						console.error("Error parsing progress data:", e);
					}
				}
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to start the crawl. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
			setCrawlProgress(null);
		}
	};

	const copyScriptTag = () => {
		const scriptGenerator = new ScriptGeneratorService(website as any);
		scriptGenerator.generateScript().then((scriptTag) => {
			navigator.clipboard.writeText(scriptTag);
			toast({
				title: "Copied",
				description:
					"Script tag copied to clipboard. Paste it into your website's HTML.",
			});
		});
	};

	const toggleScript = () => {
		setShowScript(!showScript);
	};

	return (
		<div className="space-y-6">
			<Card className="p-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold">{website.name}</h2>
						<p className="text-muted-foreground">{website.url}</p>
					</div>
					<Button onClick={handleCrawl} disabled={isLoading}>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{crawlProgress ? (
									<span>{crawlProgress.status}</span>
								) : (
									"Starting Crawl..."
								)}
							</>
						) : (
							<>
								<Play className="mr-2 h-4 w-4" />
								Start Crawl
							</>
						)}
					</Button>
				</div>
				{crawlProgress && (
					<div className="mt-4">
						<div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
							<span className="truncate mr-4">{crawlProgress.currentUrl}</span>
							<span>{crawlProgress.status}</span>
						</div>
						<div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
							<span>Pages crawled: {crawlProgress.currentPage}</span>
							<span>Pages remaining: {crawlProgress.discoveredLinks}</span>
						</div>
						<div className="w-full bg-muted rounded-full h-2">
							<div
								className="bg-primary h-2 rounded-full transition-all duration-300"
								style={{
									width: `${
										(crawlProgress.currentPage /
											(crawlProgress.currentPage +
												crawlProgress.discoveredLinks)) *
										100
									}%`,
								}}
							/>
						</div>
					</div>
				)}
			</Card>

			<Card className="p-6">
				<h3 className="mb-4 text-lg font-semibold">Status</h3>
				<div className="flex items-center space-x-2">
					<Badge
						variant={
							website.status === "active"
								? "default"
								: website.status === "error"
								? "destructive"
								: "secondary"
						}>
						{website.status}
					</Badge>
					{website.lastCrawl && (
						<span className="text-sm text-muted-foreground">
							Last crawl: {new Date(website.lastCrawl).toLocaleString()}
						</span>
					)}
				</div>
			</Card>

			{website.issues && website.issues.length > 0 && (
				<Card className="p-6">
					<h3 className="mb-4 text-lg font-semibold">Issues</h3>
					<div className="space-y-2">
						{website.issues.map((issue, index) => (
							<div
								key={index}
								className="flex items-start space-x-2 rounded-lg border p-3">
								<Badge
									variant={
										issue.severity === "error"
											? "destructive"
											: issue.severity === "warning"
											? "secondary"
											: "default"
									}>
									{issue.type}
								</Badge>
								<p className="text-sm">{issue.description}</p>
							</div>
						))}
					</div>
				</Card>
			)}

			{website.crawlData && website.crawlData.length > 0 && (
				<CrawlDataView
					websiteId={website._id}
					scriptId={website.scriptId}
					crawlData={serializedCrawlData || []}
				/>
			)}

			<Card className="p-6">
				<h3 className="mb-4 text-lg font-semibold">Integration</h3>
				<div className="space-y-4">
					<div className="flex items-center space-x-2">
						<Button variant="outline" size="sm" onClick={toggleScript}>
							<FileCode className="mr-2 h-4 w-4" />
							{showScript ? "Hide Script" : "View Script"}
						</Button>
						<Button variant="outline" size="sm" onClick={copyScriptTag}>
							<Copy className="mr-2 h-4 w-4" />
							Copy Script
						</Button>
					</div>
					{showScript && (
						<div className="space-y-4">
							<div className="rounded-lg bg-muted p-4">
								<p className="text-sm text-muted-foreground mb-2">
									Copy and paste this script tag into your website's HTML. It
									will automatically:
								</p>
								<ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
									<li>Load the SeoBuddy script asynchronously</li>
									<li>Update page titles and meta descriptions</li>
									<li>Monitor for 404 errors</li>
									<li>Track redirects</li>
									<li>Report issues to your dashboard</li>
								</ul>
							</div>
							<pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto">
								{scriptContent}
							</pre>
						</div>
					)}
				</div>
			</Card>
		</div>
	);
}
