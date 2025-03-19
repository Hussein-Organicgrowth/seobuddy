import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	url: z.string().url("Please enter a valid URL"),
});

type FormData = z.infer<typeof formSchema>;

export function AddWebsiteDialog() {
	const [open, setOpen] = useState(false);
	const { toast } = useToast();
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({
		resolver: zodResolver(formSchema),
	});

	const onSubmit = async (data: FormData) => {
		try {
			const response = await fetch("/api/websites", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error("Failed to add website");
			}

			toast({
				title: "Success",
				description: "Website added successfully",
			});

			setOpen(false);
			reset();
			// Refresh the page to show the new website
			window.location.reload();
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to add website. Please try again.",
				variant: "destructive",
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="mr-2 h-4 w-4" />
					Add Website
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add New Website</DialogTitle>
					<DialogDescription>
						Enter the details of your website to start monitoring its SEO.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Website Name</Label>
						<Input
							id="name"
							{...register("name")}
							placeholder="My Awesome Website"
						/>
						{errors.name && (
							<p className="text-sm text-red-500">{errors.name.message}</p>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="url">Website URL</Label>
						<Input
							id="url"
							{...register("url")}
							placeholder="https://example.com"
						/>
						{errors.url && (
							<p className="text-sm text-red-500">{errors.url.message}</p>
						)}
					</div>
					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Adding..." : "Add Website"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
