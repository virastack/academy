import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "secondary" };

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={["ui-button", `ui-button-${variant}`, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
