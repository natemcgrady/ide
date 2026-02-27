import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Interview IDE
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to access the code editor
        </p>
      </div>

      <Button asChild size="lg">
        <a href="/api/auth/authorize">Sign in with Vercel</a>
      </Button>
    </div>
  );
}
