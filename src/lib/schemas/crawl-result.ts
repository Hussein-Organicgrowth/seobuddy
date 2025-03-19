import mongoose from "mongoose";

const crawlResultSchema = new mongoose.Schema({
	websiteId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Website",
		required: true,
	},
	url: {
		type: String,
		required: true,
	},
	status: {
		type: String,
		enum: ["success", "error"],
		required: true,
	},
	statusCode: {
		type: Number,
		required: true,
	},
	pages: [
		{
			url: String,
			title: String,
			metaDescription: String,
			h1Tags: [String],
			canonicalUrl: String,
			robotsMeta: String,
			issues: [
				{
					type: {
						type: String,
						enum: [
							"missing_title",
							"title_too_long",
							"missing_meta_description",
							"meta_description_too_long",
							"missing_h1",
							"duplicate_h1",
							"missing_image_alt",
							"missing_canonical",
							"missing_robots_meta",
							"broken_link",
							"redirect_chain",
							"error",
						],
						required: true,
					},
					description: String,
					severity: {
						type: String,
						enum: ["low", "medium", "high"],
						required: true,
					},
				},
			],
		},
	],
	brokenLinks: [
		{
			url: String,
			statusCode: Number,
			text: String,
			sourceUrl: String,
		},
	],
	redirects: [
		{
			from: String,
			to: String,
			statusCode: Number,
		},
	],
	stats: {
		totalPages: Number,
		totalIssues: Number,
		startTime: Date,
		endTime: Date,
	},
	crawledAt: {
		type: Date,
		default: Date.now,
	},
});

export const CrawlResult =
	mongoose.models.CrawlResult ||
	mongoose.model("CrawlResult", crawlResultSchema);
