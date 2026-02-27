import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sign in failed
        </h1>
        <p className="text-sm text-muted-foreground">
          An error occurred while trying to sign in. Please try again.
        </p>
      </div>
      <Link
        href="/sign-in"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
