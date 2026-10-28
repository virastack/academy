import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Button } from "#button.tsx";
import { Price } from "#price.tsx";

test("Button calls onClick and applies the variant class", () => {
  const onClick = vi.fn();
  render(<Button variant="secondary" onClick={onClick}>Save</Button>);

  const button = screen.getByRole("button", { name: "Save" });
  fireEvent.click(button);

  expect(onClick).toHaveBeenCalledOnce();
  expect(button.className).toBe("ui-button ui-button-secondary");
});

test("Price formats the amount in euros", () => {
  render(<Price value={2499} />);

  expect(screen.getByText("€2,499.00")).toBeTruthy();
});
