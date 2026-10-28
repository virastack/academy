import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm space-y-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in to the order panel</h1>
      <LoginForm />
      <p className="text-sm text-gray-700">
        Demo accounts: admin@example.com and viewer@example.com, password: password123
      </p>
    </main>
  );
}
