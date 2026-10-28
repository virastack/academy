import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const VALID_IBAN = "89370400440532013000";

async function fillStoreStep(page: Page) {
  await page.getByLabel("Store name").fill("North Workshop");
  await page.getByLabel("VAT number").pressSequentially("123456789");
  await page.getByLabel("Category").selectOption("home");
  await page.getByLabel("Product 1 name").fill("Ceramic mug");
  await page.getByLabel("Product 1 price (€)").fill("249.90");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Contact" })).toBeVisible();
}

async function fillContactStep(page: Page, email = "ada@example.com") {
  await page.getByLabel("Full name").fill("Ada Miller");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mobile phone").pressSequentially("493012345678");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // The step buttons only work after React hydrates the page. There is no client-only
  // element to wait for, so this uses the last-resort option from the Playwright guide
  // (virastack.com/academy/playwright/assertions-and-waiting).
  await page.waitForLoadState("networkidle");
});

test("a step does not advance with errors and focuses the first invalid field", async ({ page }) => {
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText("The store name must be at least 2 characters.")).toBeVisible();
  await expect(page.getByText("A VAT number must be 9 digits after DE.")).toBeVisible();
  await expect(page.getByText("Choose a category.")).toBeVisible();
  await expect(page.getByText("Enter a price.")).toBeVisible();
  await expect(page.getByLabel("Store name")).toBeFocused();
  await expect(page.getByLabel("Store name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Store name")).toHaveAccessibleDescription(
    "The store name must be at least 2 characters.",
  );

  await page.getByLabel("Product 1 price (€)").fill("12.345");
  await page.getByLabel("Product 1 price (€)").blur();
  await expect(page.getByText("Enter the price as 249.90.")).toBeVisible();
  await page.getByLabel("Product 1 price (€)").fill("0");
  await expect(page.getByText("The price must be greater than zero.")).toBeVisible();
});

test("masks format the input but keep raw digits", async ({ page }) => {
  const taxNumber = page.getByLabel("VAT number");
  await taxNumber.pressSequentially("12ab34567890123");
  await expect(taxNumber).toHaveValue("DE123456789");

  await fillStoreStep(page);
  const phone = page.getByLabel("Mobile phone");
  await phone.pressSequentially("493012345678");
  await expect(phone).toHaveValue("+49 30 12345678");
});

test("product list adds up to three rows and keeps at least one", async ({ page }) => {
  const add = page.getByRole("button", { name: "Add product" });
  await expect(page.getByRole("button", { name: "Remove product 1" })).toBeDisabled();
  await add.click();
  await add.click();
  await expect(page.getByLabel("Product 3 name")).toBeVisible();
  await expect(add).toBeDisabled();

  await page.getByRole("button", { name: "Remove product 2" }).click();
  await expect(page.getByLabel("Product 3 name")).toHaveCount(0);
  await expect(add).toBeEnabled();
});

test("going back keeps the values of earlier steps", async ({ page }) => {
  await fillStoreStep(page);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Store name")).toHaveValue("North Workshop");
  await expect(page.getByLabel("VAT number")).toHaveValue("DE123456789");
  await expect(page.getByLabel("Product 1 price (€)")).toHaveValue("249.90");
});

test("an IBAN with a wrong checksum is rejected", async ({ page }) => {
  await fillStoreStep(page);
  await fillContactStep(page);
  const iban = page.getByLabel("IBAN");
  await iban.pressSequentially("89370400440532013001");
  await expect(iban).toHaveValue("DE89 3704 0044 0532 0130 01");
  await page.getByLabel("I have read and accept the seller agreement.").check();
  await page.getByRole("button", { name: "Submit the application" }).click();
  await expect(page.getByText("The IBAN is invalid; check the number.")).toBeVisible();
});

test("a server error returns to the step with the field and shows the message", async ({ page }) => {
  await fillStoreStep(page);
  await fillContactStep(page, "taken@example.com");
  await page.getByLabel("IBAN").pressSequentially(VALID_IBAN);
  await page.getByLabel("I have read and accept the seller agreement.").check();
  await page.getByRole("button", { name: "Submit the application" }).click();

  await expect(page.getByRole("heading", { name: "Contact" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAccessibleDescription(
    "An application with this email already exists.",
  );
  await expect(page.locator("form").getByRole("alert")).toHaveText("An application with this email already exists.");
});

test("a valid application is submitted", async ({ page }) => {
  await fillStoreStep(page);
  await fillContactStep(page);
  await page.getByLabel("IBAN").pressSequentially(VALID_IBAN);
  await page.getByRole("button", { name: "Submit the application" }).click();
  await expect(page.getByText("Accept the terms to continue.")).toBeVisible();

  await page.getByLabel("I have read and accept the seller agreement.").check();
  await page.getByRole("button", { name: "Submit the application" }).click();
  await expect(page.getByRole("status")).toContainText("Your application number: APP-6789");
});

test("every step has no detectable accessibility violations", async ({ page }) => {
  await page.getByRole("button", { name: "Next" }).click();
  for (const heading of ["Store", "Contact", "Payment"]) {
    if (heading === "Contact") await fillStoreStep(page);
    if (heading === "Payment") await fillContactStep(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, heading).toEqual([]);
  }
});
