import type { Locator, Page } from "@playwright/test";

export class OrdersPage {
  readonly heading: Locator;
  readonly statusFilter: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly statusCells: Locator;
  readonly message: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly loadError: Locator;
  readonly logout: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Siparişler" });
    this.statusFilter = page.getByLabel("Durum");
    this.table = page.getByRole("table", { name: "Sipariş listesi" });
    this.rows = this.table.getByRole("row").filter({ has: page.getByRole("cell") });
    // Her satırın dördüncü hücresi: nth(3) satırların içinde ayrı ayrı çözülür.
    this.statusCells = page.getByRole("cell").nth(3).within(this.rows);
    this.message = page.getByRole("main").getByRole("status");
    this.loading = page.getByText("Siparişler yükleniyor...");
    this.empty = page.getByText("Bu filtrede sipariş yok.");
    this.loadError = page.getByRole("alert").filter({ hasText: "Siparişler yüklenemedi." });
    this.logout = page.getByRole("button", { name: "Çıkış yap" });
  }

  async goto() {
    await this.page.goto("/orders");
  }

  row(orderId: string) {
    return this.rows.filter({ hasText: orderId });
  }

  async filterBy(label: string) {
    await this.statusFilter.selectOption({ label });
  }

  async cancel(orderId: string) {
    await this.row(orderId).getByRole("button", { name: "İptal et" }).click();
  }
}
