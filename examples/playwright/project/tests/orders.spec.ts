import { expect, test } from "./fixtures";

test.beforeEach(async ({ ordersPage }) => {
  await ordersPage.goto();
});

test("tüm siparişleri listeler", async ({ ordersPage }) => {
  await expect(ordersPage.rows).toHaveCount(6);
  await expect(ordersPage.row("SP-1001")).toContainText("Ayşe Yılmaz");
  await expect(ordersPage.row("SP-1001")).toContainText("₺1.249,90");
});

test("duruma göre filtreler", async ({ ordersPage }) => {
  await ordersPage.filterBy("Kargoda");

  await expect(ordersPage.rows).toHaveCount(2);
  await expect(ordersPage.statusCells).toHaveText(["Kargoda", "Kargoda"]);
});

test("tablo yapısı beklenen gibi", async ({ ordersPage }) => {
  await ordersPage.filterBy("Teslim edildi");

  await expect(ordersPage.table).toMatchAriaSnapshot(`
    - table "Sipariş listesi":
      - rowgroup:
        - row "Sipariş Müşteri Tutar Durum İşlem"
      - rowgroup:
        - row /SP-1003 Zeynep Demir/:
          - cell "SP-1003"
          - cell "Zeynep Demir"
          - cell /2\\.150,00/
          - cell "Teslim edildi"
          - cell
  `);
});
