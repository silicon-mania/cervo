import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <SignIn path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}
