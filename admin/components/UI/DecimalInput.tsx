"use client";

import React, { useState, useEffect, useRef } from "react";
import { parseFlexibleNumber } from "@/utils/decimal";

export interface DecimalInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string | number | null;
  onChange?: (value: string) => void;
  onCommit?: (parsedNumber: number | null, rawValue: string) => void;
  autoConvertCommaOnBlur?: boolean;
}

export const DecimalInput: React.FC<DecimalInputProps> = ({
  value,
  onChange,
  onCommit,
  className,
  placeholder,
  autoConvertCommaOnBlur = true,
  disabled,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [local, setLocal] = useState(
    value === null || value === undefined ? "" : String(value),
  );
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocal(value === null || value === undefined ? "" : String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocal(val);
    if (onChange) {
      onChange(val);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    let finalStr = local.trim();
    if (autoConvertCommaOnBlur && finalStr.includes(",")) {
      // In CDocs the comma converts to dot
      finalStr = finalStr.replace(/,/g, ".");
      setLocal(finalStr);
      if (onChange) {
        onChange(finalStr);
      }
    }
    if (onCommit) {
      const parsed = parseFlexibleNumber(finalStr);
      onCommit(parsed, finalStr);
    }
    if (onBlur) onBlur(e);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={local}
      placeholder={placeholder}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      {...rest}
    />
  );
};

export default DecimalInput;
