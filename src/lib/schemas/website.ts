import mongoose from "mongoose";

const websiteSchema = new mongoose.Schema({
	userId: {
		type: String,
		required: true,
	},
	url: {
		type: String,
		required: true,
	},
	name: {
		type: String,
		required: true,
	},
	scriptId: {
		type: String,
		required: true,
		unique: true,
	},
	lastCrawl: {
		type: Date,
		default: null,
	},
	status: {
		type: String,
		enum: ["active", "inactive", "error"],
		default: "active",
	},
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
			url: String,
			timestamp: {
				type: Date,
				default: Date.now,
			},
		},
	],
	crawlData: [
		{
			url: String,
			timestamp: {
				type: Date,
				default: Date.now,
			},
			data: mongoose.Schema.Types.Mixed,
		},
	],
	pendingUpdates: [
		{
			url: {
				type: String,
				required: true,
			},
			type: {
				type: String,
				enum: ["title", "meta"],
				required: true,
			},
			value: {
				type: String,
				required: true,
			},
			timestamp: {
				type: Date,
				default: Date.now,
			},
			applied: {
				type: Boolean,
				default: false,
			},
		},
	],
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

// Update the updatedAt timestamp before saving
websiteSchema.pre("save", function (next) {
	this.updatedAt = new Date();
	next();
});

export const Website =
	mongoose.models.Website || mongoose.model("Website", websiteSchema);
