import { expect, test } from "./fixtures";

test.beforeEach(async ({ ordersPage }) => {
  await ordersPage.goto();
});

test("lists all orders", async ({ ordersPage }) => {
  await expect(ordersPage.rows).toHaveCount(6);
  await expect(ordersPage.row("SP-1001")).toContainText("Ayşe Yılmaz");
  await expect(ordersPage.row("SP-1001")).toContainText("₺1.249,90");
});

test("filters by status", async ({ ordersPage }) => {
  await ordersPage.filterBy("Shipped");

  await expect(ordersPage.rows).toHaveCount(2);
  await expect(ordersPage.statusCells).toHaveText(["Shipped", "Shipped"]);
});

test("the table structure is as expected", async ({ ordersPage }) => {
  await ordersPage.filterBy("Delivered");

  await expect(ordersPage.table).toMatchAriaSnapshot(`
    - table "Order list":
      - rowgroup:
        - row "Order Customer Amount Status Action"
      - rowgroup:
        - row /SP-1003 Zeynep Demir/:
          - cell "SP-1003"
          - cell "Zeynep Demir"
          - cell /2\\.150,00/
          - cell "Delivered"
          - cell
  `);
});
