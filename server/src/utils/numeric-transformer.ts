import { ValueTransformer } from "typeorm";

/**
 * Postgres numeric/decimal columns are returned as strings by the pg driver.
 * Without this, arithmetic on those fields silently falls back to string
 * concatenation the moment a `+` meets a truthy numeric string like "0.00"
 * (e.g. `x || 0` never falls through to the number 0) — that's exactly how
 * totalAmount ended up as the literal string "NaN0.00NaN".
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) =>
    value === null || value === undefined ? null : parseFloat(value),
};
