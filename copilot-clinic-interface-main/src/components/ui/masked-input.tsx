import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { applyMask, normalizeDigits, type MaskType } from "@/lib/masks";

export interface MaskedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  mask: MaskType;
  value?: string;
  onValueChange?: (formattedValue: string, rawDigits: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  (
    {
      mask,
      value = "",
      onValueChange,
      onChange,
      className,
      type = "text",
      ...props
    },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      const formatted = applyMask(rawInput, mask);
      const rawDigits = normalizeDigits(rawInput);

      // Atualiza o valor do elemento no DOM
      e.target.value = formatted;

      if (onValueChange) {
        onValueChange(formatted, rawDigits);
      }

      if (onChange) {
        onChange(e);
      }
    };

    return (
      <input
        ref={ref}
        type={type}
        value={applyMask(value, mask)}
        onChange={handleChange}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

MaskedInput.displayName = "MaskedInput";
