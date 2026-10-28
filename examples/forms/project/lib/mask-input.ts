import type { MaskField } from "@virastack/mask";

export type MaskInputProps = Omit<MaskField, "rawValue">;

/** `rawValue` is not an HTML attribute, so we pull it out before spreading onto the input. */
export function toInputProps({ rawValue, ...props }: MaskField): MaskInputProps {
  void rawValue;
  return props;
}
