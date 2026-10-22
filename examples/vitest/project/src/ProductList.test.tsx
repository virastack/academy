import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductList } from "./ProductList";
import type { Product } from "./types";

const products: Product[] = [
  { id: 1, name: "Kablosuz Kulaklık", price: 1299, inStock: true },
  { id: 2, name: "Mekanik Klavye", price: 2199, inStock: true },
  { id: 3, name: "Oyuncu Faresi", price: 899, inStock: false },
];

function renderList(
  loadProducts: () => Promise<Product[]> = () => Promise.resolve(products),
  onAddToCart = vi.fn(),
) {
  render(<ProductList loadProducts={loadProducts} onAddToCart={onAddToCart} />);

  return { onAddToCart };
}

test("yüklenirken bilgi mesajı, sonra ürünleri gösterir", async () => {
  renderList();

  expect(screen.getByText("Ürünler yükleniyor...")).toBeInTheDocument();
  expect(await screen.findAllByRole("article")).toHaveLength(3);
  expect(screen.queryByText("Ürünler yükleniyor...")).not.toBeInTheDocument();
});

test("yükleme başarısız olursa hata mesajı gösterir", async () => {
  renderList(() => Promise.reject(new Error("ağ hatası")));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Ürünler yüklenemedi.",
  );
});

test("aramaya göre ürünleri filtreler", async () => {
  const user = userEvent.setup();
  renderList();

  await user.type(await screen.findByLabelText("Ürün ara"), "klavye");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(
    screen.getByRole("heading", { name: "Mekanik Klavye" }),
  ).toBeInTheDocument();
});

test("eşleşme yoksa boş durum mesajı gösterir", async () => {
  const user = userEvent.setup();
  renderList();

  await user.type(await screen.findByLabelText("Ürün ara"), "monitör");

  expect(screen.getByText("Ürün bulunamadı.")).toBeInTheDocument();
});

test("seçilen ürünü sepete ekler", async () => {
  const user = userEvent.setup();
  const { onAddToCart } = renderList();

  const card = await screen.findByRole("article", { name: "Mekanik Klavye" });
  await user.click(within(card).getByRole("button", { name: "Sepete ekle" }));

  expect(onAddToCart).toHaveBeenCalledWith(products[1]);
});

test("stokta olmayan ürünün butonu devre dışıdır", async () => {
  renderList();

  const card = await screen.findByRole("article", { name: "Oyuncu Faresi" });

  expect(
    within(card).getByRole("button", { name: "Sepete ekle" }),
  ).toBeDisabled();
});

test("yükleme bitince durum mesajı kaybolur", async () => {
  renderList();

  await waitFor(() =>
    expect(screen.queryByRole("status")).not.toBeInTheDocument(),
  );
});
