"use server";

import { z } from "zod";
import {
  applicationSchema,
  parsePrice,
  type ApplicationField,
  type ApplicationValues,
} from "@/lib/application-schema";

export type ApplicationResult =
  | { status: "success"; applicationId: string }
  | {
      status: "error";
      message: string;
      fieldErrors: Partial<Record<ApplicationField, string>>;
    };

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type StoredApplication = Omit<ApplicationValues, "products"> & {
  products: { name: string; price: number }[];
};

// A real app would write this to a database.
async function saveApplication(application: StoredApplication) {
  void application;
  await delay(400);
}

export async function submitApplication(values: unknown): Promise<ApplicationResult> {
  // Even when the client has validated, the server does not trust the input.
  const parsed = applicationSchema.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      status: "error",
      message: "The application could not be validated.",
      fieldErrors: Object.fromEntries(
        Object.entries(fieldErrors).map(([field, messages]) => [field, messages?.[0]]),
      ),
    };
  }

  if (parsed.data.email === "taken@example.com") {
    return {
      status: "error",
      message: "An application with this email already exists.",
      fieldErrors: { email: "An application with this email already exists." },
    };
  }

  // The price is validated as text and converted to a number afterwards, on the server.
  const products = parsed.data.products.map((product) => ({
    ...product,
    price: parsePrice(product.price),
  }));
  await saveApplication({ ...parsed.data, products });

  const applicationId = `APP-${parsed.data.taxNumber.slice(-4)}`;
  return { status: "success", applicationId };
}
