import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, type User } from "./store";

export const SESSION_COOKIE = "session";

export async function getSession() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return readSession(id);
}

export async function getCurrentUser(): Promise<User> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}
