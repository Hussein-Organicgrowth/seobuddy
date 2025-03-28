import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<SignUp
				appearance={{
					elements: {
						rootBox: "mx-auto",
						card: "shadow-none",
					},
				}}
				afterSignUpUrl="/dashboard"
				afterSignInUrl="/dashboard"
				signInUrl="/sign-in"
			/>
		</div>
	);
}
