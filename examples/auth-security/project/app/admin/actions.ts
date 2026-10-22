"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/dal";
import { updatePrice } from "@/lib/products";
import { setRole } from "@/lib/users";

const priceSchema = z.object({
  id: z.string().min(1),
  price: z.coerce.number().positive().max(1_000_000),
});

export async function updatePriceAction(formData: FormData) {
  await requirePermission("product:update");

  const { id, price } = priceSchema.parse(Object.fromEntries(formData));
  updatePrice(id, price);
  revalidatePath("/admin");
}

const roleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["customer", "editor", "admin"]),
});

export async function setRoleAction(formData: FormData) {
  const currentUser = await requirePermission("user:manage");

  const { id, role } = roleSchema.parse(Object.fromEntries(formData));

  if (id === currentUser.id) {
    throw new Error("Kendi rolünüzü değiştiremezsiniz.");
  }

  setRole(id, role);
  revalidatePath("/admin/users");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
