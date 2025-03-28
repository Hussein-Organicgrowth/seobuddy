// SeoBuddy Client Script
(function () {
	// Check if configuration exists
	if (!window.seobuddy || !window.seobuddy.scriptId || !window.seobuddy.websiteId || !window.seobuddy.apiUrl) {
		console.error('[SeoBuddy] Missing configuration. Please check your script setup.');
		return;
	}

	console.log('[SeoBuddy] Script initialized');
	console.log('[SeoBuddy] Configuration:', {
		websiteId: window.seobuddy.websiteId,
		scriptId: window.seobuddy.scriptId,
		apiUrl: window.seobuddy.apiUrl
	});

	// Function to normalize URLs for comparison
	function normalizeUrl(url) {
		const normalized = url.split('#')[0].replace(/\\/$/, '');
		console.log('[SeoBuddy] Normalized URL:', { original: url, normalized });
		return normalized;
	}

	// Function to check for updates
	async function checkForUpdates() {
		try {
			const currentUrl = normalizeUrl(window.location.href);
			console.log('[SeoBuddy] Checking for updates for URL:', currentUrl);
			
			const apiUrl = `${window.seobuddy.apiUrl}/api/script/${window.seobuddy.scriptId}/updates?url=${encodeURIComponent(currentUrl)}`;
			console.log('[SeoBuddy] Fetching updates from:', apiUrl);

			const response = await fetch(apiUrl, {
				headers: {
					'Authorization': `Bearer ${window.seobuddy.scriptId}`,
					'Content-Type': 'application/json'
				},
			});

			if (!response.ok) {
				console.error('[SeoBuddy] Update check failed:', {
					status: response.status,
					statusText: response.statusText
				});
				throw new Error("Failed to fetch updates");
			}

			const updates = await response.json();
			console.log('[SeoBuddy] Received updates:', updates);

			// Apply each update only if the URL matches exactly
			updates.forEach((update) => {
				const updateUrl = normalizeUrl(update.url);
				console.log('[SeoBuddy] Processing update:', {
					updateUrl,
					currentUrl,
					type: update.type,
					matches: currentUrl === updateUrl
				});

				if (currentUrl === updateUrl) {
					if (update.type === "title") {
						console.log('[SeoBuddy] Updating title:', {
							oldTitle: document.title,
							newTitle: update.value
						});
						document.title = update.value;
						const metaTitle = document.querySelector('meta[property="og:title"]');
						if (metaTitle) {
							metaTitle.setAttribute("content", update.value);
							console.log('[SeoBuddy] Updated OG title');
						}
					} else if (update.type === "meta") {
						const metaDesc = document.querySelector('meta[name="description"]');
						if (metaDesc) {
							console.log('[SeoBuddy] Updating meta description:', {
								oldDesc: metaDesc.getAttribute('content'),
								newDesc: update.value
							});
							metaDesc.setAttribute("content", update.value);
						}
						const ogDesc = document.querySelector('meta[property="og:description"]');
						if (ogDesc) {
							ogDesc.setAttribute("content", update.value);
							console.log('[SeoBuddy] Updated OG description');
						}
					}
				} else {
					console.log('[SeoBuddy] URL mismatch, skipping update:', {
						updateUrl,
						currentUrl
					});
				}
			});
		} catch (error) {
			console.error('[SeoBuddy] Update check failed:', error);
		}
	}

	// Check for updates every 30 seconds
	console.log('[SeoBuddy] Setting up update interval');
	setInterval(checkForUpdates, 30000);
	// Also check when the page loads
	console.log('[SeoBuddy] Running initial update check');
	checkForUpdates();

	// Monitor for 404 errors
	window.addEventListener("error", function (e) {
		if (e.target.tagName === "IMG" || e.target.tagName === "SCRIPT" || e.target.tagName === "LINK") {
			const url = e.target.src || e.target.href;
			if (url) {
				console.log('[SeoBuddy] Detected broken resource:', {
					type: e.target.tagName,
					url: url
				});
				fetch(`${window.seobuddy.apiUrl}/api/script/events`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						'Authorization': `Bearer ${window.seobuddy.scriptId}`
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
				}).then(() => {
					console.log('[SeoBuddy] Reported broken resource to server');
				}).catch(error => {
					console.error('[SeoBuddy] Failed to report broken resource:', error);
				});
			}
		}
	});

	// Monitor for redirects
	let lastUrl = window.location.href;
	console.log('[SeoBuddy] Starting redirect monitoring from:', lastUrl);
	setInterval(() => {
		if (window.location.href !== lastUrl) {
			console.log('[SeoBuddy] Detected redirect:', {
				from: lastUrl,
				to: window.location.href
			});
			fetch(`${window.seobuddy.apiUrl}/api/script/events`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					'Authorization': `Bearer ${window.seobuddy.scriptId}`
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
			}).then(() => {
				console.log('[SeoBuddy] Reported redirect to server');
			}).catch(error => {
				console.error('[SeoBuddy] Failed to report redirect:', error);
			});
			lastUrl = window.location.href;
		}
	}, 1000);

	console.log('[SeoBuddy] Script setup complete');
})();
