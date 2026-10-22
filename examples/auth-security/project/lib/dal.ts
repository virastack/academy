import "server-only";

import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { hasPermission, isRole, type Permission } from "@/lib/permissions";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const role = isRole(session.user.role) ? session.user.role : "customer";

  return { id: session.user.id, email: session.user.email, role };
}

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();

  if (!hasPermission(user.role, permission)) {
    forbidden();
  }

  return user;
}
