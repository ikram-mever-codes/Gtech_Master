"use strict";
// src/utils/decimal.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFlexibleNumber = parseFlexibleNumber;
exports.parseFlexibleNumberOrZero = parseFlexibleNumberOrZero;
/**
 * Accepts "," and "." interchangeably as the decimal separator.
 * Rule: if both appear, the LAST one is the decimal point and the other
 * is treated as a thousands separator and stripped. If only one appears,
 * it is always the decimal point (never assumed to be a thousands
 * separator, since prices/quantities here don't need grouping on input).
 * "." alone (the client's placeholder for "not calculated") returns null.
 */
function parseFlexibleNumber(value) {
    if (value === null || value === undefined || value === "")
        return null;
    if (typeof value === "number")
        return isNaN(value) ? null : value;
    let str = String(value).trim();
    if (str === "" || str === ".")
        return null;
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    if (lastComma !== -1 && lastDot !== -1) {
        str =
            lastComma > lastDot
                ? str.replace(/\./g, "").replace(",", ".")
                : str.replace(/,/g, "");
    }
    else if (lastComma !== -1) {
        str = str.replace(",", ".");
    }
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}
/** Same as parseFlexibleNumber but falls back to 0 instead of null. */
function parseFlexibleNumberOrZero(value) {
    var _a;
    return (_a = parseFlexibleNumber(value)) !== null && _a !== void 0 ? _a : 0;
}
