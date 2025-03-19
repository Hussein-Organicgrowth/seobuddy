"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export function AddWebsiteForm() {
	const router = useRouter();
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsLoading(true);

		const formData = new FormData(event.currentTarget);
		const name = formData.get("name") as string;
		const url = formData.get("url") as string;

		try {
			const response = await fetch("/api/websites", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name, url }),
			});

			if (!response.ok) {
				throw new Error("Failed to add website");
			}

			const data = await response.json();

			toast({
				title: "Website added",
				description: "Your website has been added successfully.",
			});

			router.push(`/dashboard/websites/${data._id}`);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to add website. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<form onSubmit={onSubmit}>
			<Card>
				<CardContent className="space-y-4 pt-6">
					<div className="space-y-2">
						<Label htmlFor="name">Website Name</Label>
						<Input id="name" name="name" placeholder="My Website" required />
					</div>
					<div className="space-y-2">
						<Label htmlFor="url">Website URL</Label>
						<Input
							id="url"
							name="url"
							type="url"
							placeholder="https://example.com"
							required
						/>
					</div>
				</CardContent>
				<CardFooter>
					<Button type="submit" className="w-full" disabled={isLoading}>
						{isLoading ? "Adding..." : "Add Website"}
					</Button>
				</CardFooter>
			</Card>
		</form>
	);
}
