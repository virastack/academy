"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const { error } = await authClient.signIn.email({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    if (error) {
      setError("E-posta ya da parola hatalı.");
      return;
    }

    router.push("/admin");
  }

  return (
    <form action={handleSubmit}>
      <p>
        <label htmlFor="email">E-posta</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </p>
      <p>
        <label htmlFor="password">Parola</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </p>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Giriş yap</button>
    </form>
  );
}
