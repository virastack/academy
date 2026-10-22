import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const VALID_IBAN = "330006100519786457841326";

async function fillStoreStep(page: Page) {
  await page.getByLabel("Mağaza adı").fill("Kuzey Atölye");
  await page.getByLabel("Vergi numarası").pressSequentially("1234567890");
  await page.getByLabel("Kategori").selectOption("home");
  await page.getByLabel("Ürün 1 adı").fill("Seramik kupa");
  await page.getByLabel("Ürün 1 fiyatı (₺)").fill("249,90");
  await page.getByRole("button", { name: "İleri" }).click();
  await expect(page.getByRole("heading", { name: "İletişim" })).toBeVisible();
}

async function fillContactStep(page: Page, email = "ada@example.com") {
  await page.getByLabel("Ad soyad").fill("Ada Yılmaz");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Cep telefonu").pressSequentially("5321234567");
  await page.getByRole("button", { name: "İleri" }).click();
  await expect(page.getByRole("heading", { name: "Ödeme" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Buttons only work after React hydrates the page.
  await page.waitForLoadState("networkidle");
});

test("a step does not advance with errors and focuses the first invalid field", async ({ page }) => {
  await page.getByRole("button", { name: "İleri" }).click();

  await expect(page.getByText("Mağaza adı en az 2 karakter olmalı.")).toBeVisible();
  await expect(page.getByText("Vergi numarası 10 haneli olmalı.")).toBeVisible();
  await expect(page.getByText("Bir kategori seçin.")).toBeVisible();
  await expect(page.getByText("Fiyat girin.")).toBeVisible();
  await expect(page.getByLabel("Mağaza adı")).toBeFocused();
  await expect(page.getByLabel("Mağaza adı")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Mağaza adı")).toHaveAccessibleDescription(
    "Mağaza adı en az 2 karakter olmalı.",
  );

  await page.getByLabel("Ürün 1 fiyatı (₺)").fill("12,345");
  await page.getByLabel("Ürün 1 fiyatı (₺)").blur();
  await expect(page.getByText("Fiyatı 249,90 biçiminde girin.")).toBeVisible();
  await page.getByLabel("Ürün 1 fiyatı (₺)").fill("0");
  await expect(page.getByText("Fiyat sıfırdan büyük olmalı.")).toBeVisible();
});

test("masks format the input but keep raw digits", async ({ page }) => {
  const taxNumber = page.getByLabel("Vergi numarası");
  await taxNumber.pressSequentially("12ab34567890123");
  await expect(taxNumber).toHaveValue("1234567890");

  await fillStoreStep(page);
  const phone = page.getByLabel("Cep telefonu");
  await phone.pressSequentially("5321234567");
  await expect(phone).toHaveValue("(532) 123 45 67");
});

test("product list adds up to three rows and keeps at least one", async ({ page }) => {
  const add = page.getByRole("button", { name: "Ürün ekle" });
  await expect(page.getByRole("button", { name: "Ürün 1 kaldır" })).toBeDisabled();
  await add.click();
  await add.click();
  await expect(page.getByLabel("Ürün 3 adı")).toBeVisible();
  await expect(add).toBeDisabled();

  await page.getByRole("button", { name: "Ürün 2 kaldır" }).click();
  await expect(page.getByLabel("Ürün 3 adı")).toHaveCount(0);
  await expect(add).toBeEnabled();
});

test("going back keeps the values of earlier steps", async ({ page }) => {
  await fillStoreStep(page);
  await page.getByRole("button", { name: "Geri" }).click();
  await expect(page.getByLabel("Mağaza adı")).toHaveValue("Kuzey Atölye");
  await expect(page.getByLabel("Vergi numarası")).toHaveValue("1234567890");
  await expect(page.getByLabel("Ürün 1 fiyatı (₺)")).toHaveValue("249,90");
});

test("an IBAN with a wrong checksum is rejected", async ({ page }) => {
  await fillStoreStep(page);
  await fillContactStep(page);
  const iban = page.getByLabel("IBAN");
  await iban.pressSequentially("330006100519786457841327");
  await expect(iban).toHaveValue("TR33 0006 1005 1978 6457 8413 27");
  await page.getByLabel("Satıcı sözleşmesini okudum ve kabul ediyorum.").check();
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
  await expect(page.getByText("IBAN hatalı; numarayı kontrol edin.")).toBeVisible();
});

test("a server error returns to the step with the field and shows the message", async ({ page }) => {
  await fillStoreStep(page);
  await fillContactStep(page, "taken@example.com");
  await page.getByLabel("IBAN").pressSequentially(VALID_IBAN);
  await page.getByLabel("Satıcı sözleşmesini okudum ve kabul ediyorum.").check();
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();

  await expect(page.getByRole("heading", { name: "İletişim" })).toBeVisible();
  await expect(page.getByLabel("E-posta")).toHaveAccessibleDescription(
    "Bu e-posta ile daha önce başvuru yapılmış.",
  );
  await expect(page.locator("form").getByRole("alert")).toHaveText("Bu e-posta ile daha önce başvuru yapılmış.");
});

test("a valid application is submitted", async ({ page }) => {
  await fillStoreStep(page);
  await fillContactStep(page);
  await page.getByLabel("IBAN").pressSequentially(VALID_IBAN);
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
  await expect(page.getByText("Devam etmek için koşulları kabul edin.")).toBeVisible();

  await page.getByLabel("Satıcı sözleşmesini okudum ve kabul ediyorum.").check();
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
  await expect(page.getByRole("status")).toContainText("Başvuru numaranız: APP-7890");
});

test("every step has no detectable accessibility violations", async ({ page }) => {
  await page.getByRole("button", { name: "İleri" }).click();
  for (const heading of ["Mağaza", "İletişim", "Ödeme"]) {
    if (heading === "İletişim") await fillStoreStep(page);
    if (heading === "Ödeme") await fillContactStep(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, heading).toEqual([]);
  }
});
