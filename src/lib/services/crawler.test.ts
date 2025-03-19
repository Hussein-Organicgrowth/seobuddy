import { CrawlerService } from "./crawler";
import { Website } from "../schemas/website";
import connectDB from "../mongodb";

interface PageData {
	url: string;
	title: string;
	metaDescription: string;
	h1Tags: string[];
	canonicalUrl?: string;
	robotsMeta?: string;
}

async function testCrawler() {
	try {
		// Connect to MongoDB
		await connectDB();
		console.log("Connected to MongoDB");

		// Get all websites
		const websites = await Website.find({});
		console.log(`Found ${websites.length} websites to test`);

		// Test each website
		for (const website of websites) {
			console.log(
				`\nTesting crawler for website: ${website.name} (${website.url})`
			);

			// Create crawler instance
			const crawler = new CrawlerService(website);

			// Track progress
			let progressUpdates: any[] = [];
			const onProgress = (progress: any) => {
				progressUpdates.push(progress);
				console.log("Progress Update:", progress);
			};

			try {
				// Start crawling
				console.log("Starting crawler...");
				const result = await crawler.crawl({
					maxPages: 10,
					maxDepth: 3,
					rateLimit: 1000,
					onProgress,
				});

				// Log results
				console.log("\nCrawl Results:");
				console.log("Total Pages:", result.pages.length);
				console.log("Broken Links:", result.brokenLinks.length);
				console.log("Redirects:", result.redirects.length);
				console.log("Stats:", result.stats);

				// Verify SEO data
				console.log("\nSEO Data Verification:");
				result.pages.forEach((page: PageData, index: number) => {
					console.log(`\nPage ${index + 1}:`);
					console.log("URL:", page.url);
					console.log("Title:", page.title);
					console.log("Meta Description:", page.metaDescription);
					console.log("H1 Tags:", page.h1Tags);
					console.log("Canonical URL:", page.canonicalUrl);
					console.log("Robots Meta:", page.robotsMeta);
				});

				// Verify link discovery
				console.log("\nLink Discovery Verification:");
				console.log("Total Progress Updates:", progressUpdates.length);
				console.log(
					"Final Queue Size:",
					progressUpdates[progressUpdates.length - 1]?.discoveredLinks
				);

				// Wait a bit before testing the next website
				await new Promise((resolve) => setTimeout(resolve, 2000));
			} catch (error) {
				console.error(`Error crawling ${website.name}:`, error);
			}
		}
	} catch (error) {
		console.error("Test failed:", error);
	}
}

// Run the test
testCrawler().catch(console.error);
