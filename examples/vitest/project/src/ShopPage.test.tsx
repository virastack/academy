import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { server } from "./mocks/server";
import { ShopPage } from "./ShopPage";
import { renderWithProviders } from "./test-utils";

describe("ShopPage", () => {
  test("kullanıcı ürünleri sepete ekler ve toplamı görür", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShopPage />);

    const keyboard = await screen.findByRole("article", {
      name: "Mekanik Klavye",
    });
    await user.click(
      within(keyboard).getByRole("button", { name: "Sepete ekle" }),
    );
    await user.click(
      within(keyboard).getByRole("button", { name: "Sepete ekle" }),
    );

    const headphones = screen.getByRole("article", {
      name: "Kablosuz Kulaklık",
    });
    await user.click(
      within(headphones).getByRole("button", { name: "Sepete ekle" }),
    );

    expect(screen.getByRole("link", { name: "Sepet (3)" })).toBeInTheDocument();

    const summary = screen.getByRole("region", { name: "Sepet özeti" });
    expect(within(summary).getByText("Mekanik Klavye × 2")).toBeInTheDocument();
    expect(
      within(summary).getByText("Kablosuz Kulaklık × 1"),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Toplam: ₺5.697,00")).toBeInTheDocument();
  });

  test("kullanıcı ürünü sepetten çıkarır", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShopPage />);

    const keyboard = await screen.findByRole("article", {
      name: "Mekanik Klavye",
    });
    await user.click(
      within(keyboard).getByRole("button", { name: "Sepete ekle" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Mekanik Klavye ürününü sepetten çıkar",
      }),
    );

    expect(screen.getByText("Sepetiniz boş.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sepet (0)" })).toBeInTheDocument();
  });

  test("stokta olmayan ürün sepete eklenemez", async () => {
    renderWithProviders(<ShopPage />);

    const mouse = await screen.findByRole("article", { name: "Oyuncu Faresi" });

    expect(within(mouse).getByText("Stokta yok")).toBeVisible();
    expect(
      within(mouse).getByRole("button", { name: "Sepete ekle" }),
    ).toBeDisabled();
  });

  test("API hata verirse sepet çalışmaya devam eder", async () => {
    server.use(
      http.get(
        "https://api.magaza.test/products",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    renderWithProviders(<ShopPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ürünler yüklenemedi.",
    );
    expect(screen.getByRole("link", { name: "Sepet (0)" })).toBeInTheDocument();
    expect(screen.getByText("Sepetiniz boş.")).toBeInTheDocument();
  });
});
