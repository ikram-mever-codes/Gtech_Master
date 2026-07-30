"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.numericTransformer = void 0;
/**
 * Postgres numeric/decimal columns are returned as strings by the pg driver.
 * Without this, arithmetic on those fields silently falls back to string
 * concatenation the moment a `+` meets a truthy numeric string like "0.00"
 * (e.g. `x || 0` never falls through to the number 0) — that's exactly how
 * totalAmount ended up as the literal string "NaN0.00NaN".
 */
exports.numericTransformer = {
    to: (value) => value,
    from: (value) => value === null || value === undefined ? null : parseFloat(value),
};
