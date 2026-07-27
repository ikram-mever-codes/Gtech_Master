export interface CommercialFilters {
  documentNo: string;
  customerNo: string;
  customerName: string;
  valueOperator: "=" | ">" | "<";
  valueAmount: string;
  status: string;
  datePreset: "all" | "today" | "this_month" | "last_month" | "this_year" | "last_year" | "custom";
  dateFrom: string;
  dateTo: string;
}

export const initialCommercialFilters: CommercialFilters = {
  documentNo: "",
  customerNo: "",
  customerName: "",
  valueOperator: "=",
  valueAmount: "",
  status: "",
  datePreset: "all",
  dateFrom: "",
  dateTo: "",
};

export const isValueMatching = (
  docValue: number,
  operator: string,
  enteredStr: string
) => {
  if (!enteredStr || enteredStr.trim() === "") return true;
  const normalizedStr = enteredStr.replace(",", ".").trim();
  const numVal = parseFloat(normalizedStr);
  if (isNaN(numVal)) return true;

  const docRounded = Math.round(docValue * 100) / 100;
  const numRounded = Math.round(numVal * 100) / 100;

  if (operator === "=") {
    return Math.abs(docRounded - numRounded) < 0.01;
  }
  if (operator === ">" || operator === "&gt;") {
    return docRounded > numRounded;
  }
  if (operator === "<" || operator === "&lt;") {
    return docRounded < numRounded;
  }
  return true;
};

export const parseCustomDate = (inputStr: string, isEnd = false) => {
  if (!inputStr || !inputStr.trim()) return null;
  const str = inputStr.trim();
  if (str.includes(".")) {
    const parts = str.split(".");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return isEnd
          ? new Date(year, month, day, 23, 59, 59, 999)
          : new Date(year, month, day, 0, 0, 0, 0);
      }
    }
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  if (isEnd) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
};

export const isDateInPreset = (
  dateStr: string | Date | undefined,
  preset: string,
  customFrom?: string,
  customTo?: string
) => {
  if (!dateStr || preset === "all") return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (preset === "today") {
    return d >= startOfToday && d <= endOfToday;
  }

  if (preset === "this_month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return d >= startOfMonth && d <= endOfMonth;
  }

  if (preset === "last_month") {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return d >= startOfLastMonth && d <= endOfLastMonth;
  }

  if (preset === "this_year") {
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return d >= startOfYear && d <= endOfYear;
  }

  if (preset === "last_year") {
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return d >= startOfLastYear && d <= endOfLastYear;
  }

  if (preset === "custom") {
    if (customFrom) {
      const fromD = parseCustomDate(customFrom);
      if (fromD && d < fromD) return false;
    }
    if (customTo) {
      const toD = parseCustomDate(customTo, true);
      if (toD && d > toD) return false;
    }
    return true;
  }

  return true;
};