import { Website } from "../schemas/website";
import { CrawlResult } from "../schemas/crawl-result";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import { URL } from "url";

interface CrawlOptions {
	maxPages?: number;
	followRedirects?: boolean;
	checkBrokenLinks?: boolean;
	maxDepth?: number;
	rateLimit?: number; // ms between requests
	onProgress?: (progress: {
		currentPage: number;
		totalPages: number;
		currentUrl: string;
		status: string;
		discoveredLinks: number;
	}) => void;
}

interface PageData {
	url: string;
	title: string;
	metaDescription: string;
	h1Tags: string[];
	canonicalUrl?: string;
	robotsMeta?: string;
	issues: Array<{
		type: string;
		description: string;
		severity: "low" | "medium" | "high";
	}>;
	html: string;
}

interface PageDocument {
	url: string;
	document: Document;
}

interface FetchError extends Error {
	status?: number;
}

export class CrawlerService {
	private visitedUrls: Set<string> = new Set();
	private brokenLinks: Array<{
		url: string;
		statusCode: number;
		text: string;
		sourceUrl: string;
	}> = [];
	private redirects: Array<{ from: string; to: string; statusCode: number }> =
		[];
	private baseUrl: URL;
	private crawlStats = {
		totalPages: 0,
		totalIssues: 0,
		startTime: new Date(),
		endTime: new Date(),
	};

	constructor(private website: any) {
		this.baseUrl = new URL(website.url);
		console.log(`[Crawler] Initialized for website: ${this.website.url}`);
	}

	async crawl(options: CrawlOptions = {}) {
		const {
			maxPages = 100,
			followRedirects = true,
			checkBrokenLinks = true,
			maxDepth = 5,
			rateLimit = 500,
			onProgress,
		} = options;

		console.log(`[Crawler] Starting crawl with options:`, {
			maxPages,
			followRedirects,
			checkBrokenLinks,
			maxDepth,
			rateLimit,
		});

		this.crawlStats.startTime = new Date();
		const pages: PageData[] = [];
		const queue: string[] = [this.website.url];
		let currentPage = 0;

		try {
			while (queue.length > 0 && currentPage < maxPages) {
				const url = queue.shift();
				if (!url || this.visitedUrls.has(url)) {
					console.log(`[Crawler] Skipping ${url} - already visited or invalid`);
					continue;
				}

				console.log(
					`[Crawler] Processing URL (${currentPage + 1}/${maxPages}): ${url}`
				);
				console.log(`[Crawler] Queue size: ${queue.length}`);

				onProgress?.({
					currentPage,
					totalPages: maxPages,
					currentUrl: url,
					status: `Crawling page ${currentPage + 1} of ${maxPages}`,
					discoveredLinks: queue.length,
				});

				const pageData = await this.crawlPage(
					url,
					0,
					maxDepth,
					rateLimit,
					onProgress
				);
				if (pageData) {
					pages.push(pageData);
					currentPage++;
					console.log(`[Crawler] Successfully crawled page: ${url}`);

					// Extract and add new links to the queue
					const newLinks = this.extractInternalLinks({
						url,
						document: new JSDOM(pageData.html).window.document,
					});

					console.log(`[Crawler] Found ${newLinks.length} new links on ${url}`);

					// Add new links to queue if not visited
					let addedLinks = 0;
					newLinks.forEach((link) => {
						if (!this.visitedUrls.has(link) && !queue.includes(link)) {
							queue.push(link);
							addedLinks++;
						}
					});

					console.log(`[Crawler] Added ${addedLinks} new links to queue`);
					console.log(`[Crawler] Current queue size: ${queue.length}`);

					onProgress?.({
						currentPage,
						totalPages: maxPages,
						currentUrl: url,
						status: `Found ${newLinks.length} new links on this page`,
						discoveredLinks: queue.length,
					});
				}
			}

			console.log(
				`[Crawler] Crawl completed. Total pages crawled: ${pages.length}`
			);
			this.crawlStats.endTime = new Date();
			this.crawlStats.totalPages = pages.length;

			onProgress?.({
				currentPage: pages.length,
				totalPages: maxPages,
				currentUrl: this.website.url,
				status: `Crawl completed. Found ${pages.length} pages.`,
				discoveredLinks: 0,
			});

			// Create crawl result
			const crawlResult = await CrawlResult.create({
				websiteId: this.website._id,
				url: this.website.url,
				status: "success",
				statusCode: 200,
				pages: pages.map((page) => ({
					url: page.url,
					title: page.title,
					metaDescription: page.metaDescription,
					h1Tags: page.h1Tags,
					canonicalUrl: page.canonicalUrl,
					robotsMeta: page.robotsMeta,
				})),
				brokenLinks: this.brokenLinks,
				redirects: this.redirects,
				stats: this.crawlStats,
			});

			console.log(`[Crawler] Created crawl result with ${pages.length} pages`);
			console.log(`[Crawler] Broken links: ${this.brokenLinks.length}`);
			console.log(`[Crawler] Redirects: ${this.redirects.length}`);

			// Update website last crawl time and crawl data
			await Website.findByIdAndUpdate(this.website._id, {
				lastCrawl: new Date(),
				status: "active",
				crawlData: pages.map((page) => ({
					url: page.url,
					timestamp: new Date(),
					data: {
						title: page.title,
						metaDescription: page.metaDescription,
						redirects: this.redirects.filter((r) => r.from === page.url),
						brokenLinks: this.brokenLinks.filter(
							(b) => b.sourceUrl === page.url
						),
					},
				})),
			});

			console.log(`[Crawler] Updated website data in database`);
			return crawlResult;
		} catch (error) {
			console.error("[Crawler] Error during crawl:", error);

			onProgress?.({
				currentPage: pages.length,
				totalPages: maxPages,
				currentUrl: this.website.url,
				status: "Crawl failed. Please try again.",
				discoveredLinks: queue.length,
			});

			const crawlResult = await CrawlResult.create({
				websiteId: this.website._id,
				url: this.website.url,
				status: "error",
				statusCode: 500,
				stats: this.crawlStats,
			});

			await Website.findByIdAndUpdate(this.website._id, {
				lastCrawl: new Date(),
				status: "error",
			});

			return crawlResult;
		}
	}

	private async crawlPage(
		url: string,
		depth: number,
		maxDepth: number,
		rateLimit: number,
		onProgress?: CrawlOptions["onProgress"]
	): Promise<PageData | null> {
		if (this.visitedUrls.has(url)) {
			console.log(`[Crawler] Page already visited: ${url}`);
			return null;
		}

		console.log(`[Crawler] Starting to crawl page: ${url}`);
		console.log(`[Crawler] Current depth: ${depth}/${maxDepth}`);

		// Rate limiting
		await new Promise((resolve) => setTimeout(resolve, rateLimit));

		try {
			onProgress?.({
				currentPage: this.visitedUrls.size + 1,
				totalPages: 100,
				currentUrl: url,
				status: `Fetching page content...`,
				discoveredLinks: 0,
			});

			console.log(`[Crawler] Fetching content from: ${url}`);
			const response = await fetch(url, {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					Accept:
						"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
					"Accept-Language": "en-US,en;q=0.5",
					"Accept-Encoding": "gzip, deflate, br",
					Connection: "keep-alive",
					"Upgrade-Insecure-Requests": "1",
					"Cache-Control": "max-age=0",
					TE: "Trailers",
					Referer: this.baseUrl.origin,
				},
				redirect: "follow",
				method: "GET",
			});

			if (!response.ok) {
				console.log(
					`[Crawler] Failed to fetch ${url}: ${response.status} ${response.statusText}`
				);
				throw new Error(
					`Failed to fetch ${url}: ${response.status} ${response.statusText}`
				);
			}

			const html = await response.text();
			console.log(`[Crawler] Successfully fetched content from: ${url}`);

			const dom = new JSDOM(html);
			const document = dom.window.document;

			this.visitedUrls.add(url);
			console.log(`[Crawler] Added to visited URLs: ${url}`);

			// Extract SEO information
			const title = document.title || "";
			const metaDescription =
				document
					.querySelector('meta[name="description"]')
					?.getAttribute("content") || "";
			const canonicalUrl =
				document.querySelector('link[rel="canonical"]')?.getAttribute("href") ||
				undefined;
			const robotsMeta =
				document
					.querySelector('meta[name="robots"]')
					?.getAttribute("content") || undefined;
			const h1Tags = Array.from(document.getElementsByTagName("h1")).map(
				(h1) => h1.textContent || ""
			);
			const h2Tags = Array.from(document.getElementsByTagName("h2")).map(
				(h2) => h2.textContent || ""
			);
			const images = Array.from(document.getElementsByTagName("img")).map(
				(img) => ({
					src: img.getAttribute("src") || "",
					alt: img.getAttribute("alt") || "",
				})
			);

			console.log(`[Crawler] Extracted SEO data from: ${url}`);
			console.log(`[Crawler] Title: ${title}`);
			console.log(
				`[Crawler] Meta description length: ${metaDescription.length}`
			);
			console.log(`[Crawler] H1 tags: ${h1Tags.length}`);
			console.log(`[Crawler] H2 tags: ${h2Tags.length}`);
			console.log(`[Crawler] Images: ${images.length}`);

			onProgress?.({
				currentPage: this.visitedUrls.size,
				totalPages: 100,
				currentUrl: url,
				status: `Analyzing page content...`,
				discoveredLinks: 0,
			});

			// Check for issues
			const issues = this.checkForIssues({
				url,
				title,
				metaDescription,
				h1Tags,
				h2Tags,
				images,
				canonicalUrl,
				robotsMeta,
			});

			console.log(`[Crawler] Found ${issues.length} issues on: ${url}`);
			issues.forEach((issue) => {
				console.log(`[Crawler] Issue: ${issue.type} (${issue.severity})`);
			});

			return {
				url,
				title,
				metaDescription,
				h1Tags,
				canonicalUrl,
				robotsMeta,
				issues,
				html,
			};
		} catch (error) {
			console.error(`[Crawler] Error crawling ${url}:`, error);
			const fetchError = error as FetchError;
			this.brokenLinks.push({
				url,
				statusCode: fetchError.status || 500,
				text: fetchError.message,
				sourceUrl: url,
			});
			console.log(`[Crawler] Added to broken links: ${url}`);
			return null;
		}
	}

	private extractInternalLinks(pageData: PageDocument): string[] {
		console.log(`[Crawler] Extracting links from: ${pageData.url}`);
		const links = Array.from(pageData.document.getElementsByTagName("a"))
			.map((a) => {
				const href = a.getAttribute("href");
				if (!href) return null;

				try {
					// If it's a relative URL, convert it to absolute
					if (href.startsWith("/")) {
						return new URL(href, this.baseUrl.origin).toString();
					}
					// If it's already an absolute URL, use it as is
					return new URL(href).toString();
				} catch {
					console.log(`[Crawler] Invalid URL found: ${href}`);
					return null;
				}
			})
			.filter((href): href is string => href !== null)
			.filter((href) => {
				try {
					const url = new URL(href);
					return url.origin === this.baseUrl.origin;
				} catch {
					console.log(`[Crawler] Invalid URL found: ${href}`);
					return false;
				}
			});

		const uniqueLinks = [...new Set(links)];
		console.log(
			`[Crawler] Found ${uniqueLinks.length} unique internal links on: ${pageData.url}`
		);
		return uniqueLinks;
	}

	private checkForIssues(pageData: {
		url: string;
		title: string;
		metaDescription: string;
		h1Tags: string[];
		h2Tags: string[];
		images: Array<{ src: string; alt: string }>;
		canonicalUrl?: string;
		robotsMeta?: string;
	}): Array<{
		type: string;
		description: string;
		severity: "low" | "medium" | "high";
	}> {
		const issues: Array<{
			type: string;
			description: string;
			severity: "low" | "medium" | "high";
		}> = [];

		// Title checks
		if (!pageData.title) {
			issues.push({
				type: "missing_title",
				description: "Page is missing a title tag",
				severity: "high",
			});
		} else if (pageData.title.length > 60) {
			issues.push({
				type: "title_too_long",
				description: "Title tag is too long (should be under 60 characters)",
				severity: "medium",
			});
		}

		// Meta description checks
		if (!pageData.metaDescription) {
			issues.push({
				type: "missing_meta_description",
				description: "Page is missing a meta description",
				severity: "medium",
			});
		} else if (pageData.metaDescription.length > 160) {
			issues.push({
				type: "meta_description_too_long",
				description:
					"Meta description is too long (should be under 160 characters)",
				severity: "low",
			});
		}

		// Heading checks
		if (pageData.h1Tags.length === 0) {
			issues.push({
				type: "missing_h1",
				description: "Page is missing an H1 tag",
				severity: "high",
			});
		} else if (pageData.h1Tags.length > 1) {
			issues.push({
				type: "duplicate_h1",
				description: `Page has ${pageData.h1Tags.length} H1 tags. Only one H1 tag is recommended.`,
				severity: "medium",
			});
		}

		// Image checks
		const imagesWithoutAlt = pageData.images.filter((img) => !img.alt);
		if (imagesWithoutAlt.length > 0) {
			issues.push({
				type: "missing_image_alt",
				description: `${imagesWithoutAlt.length} images are missing alt text`,
				severity: "medium",
			});
		}

		// Canonical URL check
		if (!pageData.canonicalUrl) {
			issues.push({
				type: "missing_canonical",
				description: "Page is missing a canonical URL",
				severity: "low",
			});
		}

		// Robots meta check
		if (!pageData.robotsMeta) {
			issues.push({
				type: "missing_robots_meta",
				description: "Page is missing robots meta tag",
				severity: "low",
			});
		}

		return issues;
	}
}
