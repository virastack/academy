import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm space-y-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Sipariş paneline giriş</h1>
      <LoginForm />
      <p className="text-sm text-gray-700">
        Demo hesaplar: yonetici@example.com ve izleyici@example.com, parola: parola123
      </p>
    </main>
  );
}
