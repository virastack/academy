import type { ComponentProps } from "react";

export function Button(props: ComponentProps<"button">) {
  return <button type="button" className="button" {...props} />;
}
