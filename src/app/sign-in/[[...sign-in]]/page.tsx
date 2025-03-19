import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<SignIn
				appearance={{
					elements: {
						rootBox: "mx-auto",
						card: "shadow-xl",
					},
				}}
				path="/sign-in"
				afterSignInUrl="/dashboard"
				afterSignUpUrl="/dashboard"
				redirectUrl="/dashboard"
				routing="path"
				signUpUrl="/sign-up"
			/>
		</div>
	);
}
