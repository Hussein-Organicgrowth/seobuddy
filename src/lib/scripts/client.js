// SeoBuddy Client Script
console.log("[SeoBuddy] Script file loaded");

// Initialize as early as possible
(function initializeSeoBuddy() {
	console.log("[SeoBuddy] Starting initialization");

	// Get configuration from script tag
	const script = document.currentScript;
	if (!script) {
		console.error("[SeoBuddy] Script tag not found");
		return;
	}

	const websiteId = script.getAttribute("data-website-id");
	const scriptId = script.getAttribute("data-script-id");
	const apiUrl = script.src.split("/api/script/")[0];

	// Check if configuration exists
	if (!websiteId || !scriptId || !apiUrl) {
		console.error("[SeoBuddy] Missing configuration:", {
			websiteId,
			scriptId,
			apiUrl,
		});
		return;
	}

	// Initialize SeoBuddy configuration
	window.seobuddy = {
		websiteId,
		scriptId,
		apiUrl,
	};

	console.log("[SeoBuddy] Configuration loaded:", {
		websiteId,
		scriptId,
		apiUrl,
	});

	// Function to normalize URLs for comparison
	function normalizeUrl(url) {
		try {
			// Create URL object to properly parse the URL
			const urlObj = new URL(url);

			// Get the pathname and remove trailing slash
			let path = urlObj.pathname.replace(/\/$/, "");

			// Remove any query parameters and hash
			const normalized = `${urlObj.protocol}//${urlObj.host}${path}`;

			console.log("[SeoBuddy] Normalized URL:", {
				original: url,
				normalized,
				path,
				host: urlObj.host,
			});

			return normalized;
		} catch (error) {
			console.error("[SeoBuddy] URL normalization failed:", error);
			// Fallback to basic normalization if URL parsing fails
			return url.split("#")[0].replace(/\/$/, "");
		}
	}

	// Function to check for updates
	async function checkForUpdates() {
		try {
			const currentUrl = normalizeUrl(window.location.href);
			console.log("[SeoBuddy] Checking for updates for URL:", currentUrl);

			const apiUrl = `${window.seobuddy.apiUrl}/api/script/${
				window.seobuddy.scriptId
			}/crawl-data?url=${encodeURIComponent(currentUrl)}`;
			console.log("[SeoBuddy] Fetching crawl data from:", apiUrl);

			const response = await fetch(apiUrl, {
				headers: {
					Authorization: `Bearer ${window.seobuddy.scriptId}`,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				console.error("[SeoBuddy] Failed to fetch crawl data:", {
					status: response.status,
					statusText: response.statusText,
					url: apiUrl,
				});
				throw new Error("Failed to fetch crawl data");
			}

			const crawlData = await response.json();
			console.log("[SeoBuddy] Received crawl data:", crawlData);

			if (crawlData && crawlData.data) {
				// Update title if it exists and is different
				if (crawlData.data.title && crawlData.data.title !== document.title) {
					console.log("[SeoBuddy] Updating title:", {
						oldTitle: document.title,
						newTitle: crawlData.data.title,
					});

					// Update both title and og:title
					document.title = crawlData.data.title;

					// Update Open Graph title
					let metaTitle = document.querySelector('meta[property="og:title"]');
					if (!metaTitle) {
						metaTitle = document.createElement("meta");
						metaTitle.setAttribute("property", "og:title");
						document.head.appendChild(metaTitle);
					}
					metaTitle.setAttribute("content", crawlData.data.title);
				}

				// Update meta description if it exists and is different
				const metaDesc = document.querySelector('meta[name="description"]');
				if (crawlData.data.metaDescription && metaDesc) {
					const currentDesc = metaDesc.getAttribute("content");
					if (crawlData.data.metaDescription !== currentDesc) {
						console.log("[SeoBuddy] Updating meta description:", {
							oldDesc: currentDesc,
							newDesc: crawlData.data.metaDescription,
						});
						metaDesc.setAttribute("content", crawlData.data.metaDescription);
					}
				}

				// Update og:description if it exists
				const ogDesc = document.querySelector(
					'meta[property="og:description"]'
				);
				if (crawlData.data.metaDescription && ogDesc) {
					ogDesc.setAttribute("content", crawlData.data.metaDescription);
					console.log("[SeoBuddy] Updated OG description");
				}
			}
		} catch (error) {
			console.error("[SeoBuddy] Update check failed:", error);
		}
	}

	// Check for updates every 30 seconds
	console.log("[SeoBuddy] Setting up update interval");
	setInterval(checkForUpdates, 30000);

	// Run initial check when DOM is ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => {
			console.log("[SeoBuddy] DOM loaded, running initial update check");
			checkForUpdates();
		});
	} else {
		console.log("[SeoBuddy] DOM already loaded, running initial update check");
		checkForUpdates();
	}

	// Monitor for 404 errors
	window.addEventListener("error", function (e) {
		if (
			e.target.tagName === "IMG" ||
			e.target.tagName === "SCRIPT" ||
			e.target.tagName === "LINK"
		) {
			const url = e.target.src || e.target.href;
			if (url) {
				console.log("[SeoBuddy] Detected broken resource:", {
					type: e.target.tagName,
					url: url,
				});
				fetch(`${window.seobuddy.apiUrl}/api/script/events`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${window.seobuddy.scriptId}`,
					},
					body: JSON.stringify({
						websiteId: window.seobuddy.websiteId,
						scriptId: window.seobuddy.scriptId,
						event: "issue",
						data: {
							type: "broken_link",
							description: "Broken resource found: " + url,
							severity: "error",
							url: window.location.href,
						},
					}),
				})
					.then(() => {
						console.log("[SeoBuddy] Reported broken resource to server");
					})
					.catch((error) => {
						console.error(
							"[SeoBuddy] Failed to report broken resource:",
							error
						);
					});
			}
		}
	});

	// Monitor for redirects
	let lastUrl = window.location.href;
	console.log("[SeoBuddy] Starting redirect monitoring from:", lastUrl);
	setInterval(() => {
		if (window.location.href !== lastUrl) {
			console.log("[SeoBuddy] Detected redirect:", {
				from: lastUrl,
				to: window.location.href,
			});
			fetch(`${window.seobuddy.apiUrl}/api/script/events`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${window.seobuddy.scriptId}`,
				},
				body: JSON.stringify({
					websiteId: window.seobuddy.websiteId,
					scriptId: window.seobuddy.scriptId,
					event: "redirect",
					data: {
						from: lastUrl,
						to: window.location.href,
						timestamp: new Date().toISOString(),
					},
				}),
			})
				.then(() => {
					console.log("[SeoBuddy] Reported redirect to server");
				})
				.catch((error) => {
					console.error("[SeoBuddy] Failed to report redirect:", error);
				});
			lastUrl = window.location.href;
		}
	}, 1000);

	console.log("[SeoBuddy] Script setup complete");
})();
