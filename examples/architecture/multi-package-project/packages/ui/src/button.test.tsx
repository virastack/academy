import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Button } from "#button.tsx";
import { Price } from "#price.tsx";

test("Button calls onClick and applies the variant class", () => {
  const onClick = vi.fn();
  render(<Button variant="secondary" onClick={onClick}>Kaydet</Button>);

  const button = screen.getByRole("button", { name: "Kaydet" });
  fireEvent.click(button);

  expect(onClick).toHaveBeenCalledOnce();
  expect(button.className).toBe("ui-button ui-button-secondary");
});

test("Price formats Turkish lira", () => {
  render(<Price value={2499} />);

  expect(screen.getByText("₺2.499,00")).toBeTruthy();
});
