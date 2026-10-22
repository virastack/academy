import type { MaskField } from "@virastack/mask";

export type MaskInputProps = Omit<MaskField, "rawValue">;

/** `rawValue` bir HTML özelliği değil; input'a yaymadan önce ayırıyoruz. */
export function toInputProps({ rawValue, ...props }: MaskField): MaskInputProps {
  void rawValue;
  return props;
}
