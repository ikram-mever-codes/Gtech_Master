export const formatDate = (
  dateString: string | Date | null | undefined,
  hideCurrentYear: boolean = false,
) => {
  if (!dateString || dateString === "0000-00-00 00:00:00") return "—";

  let day = "";
  let month = "";
  let year = "";

  if (typeof dateString === "string") {
    const trimmed = dateString.trim();
    const parts = trimmed.split(".");
    if (parts.length === 3 && parts[2].length === 4) {
      day = parts[0].padStart(2, "0");
      month = parts[1].padStart(2, "0");
      year = parts[2];
    } else {
      const dashParts = trimmed.split("T")[0].split("-");
      if (dashParts.length === 3 && dashParts[0].length === 4) {
        year = dashParts[0];
        month = dashParts[1].padStart(2, "0");
        day = dashParts[2].padStart(2, "0");
      }
    }
  }

  if (!day || !month || !year) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    day = String(date.getDate()).padStart(2, "0");
    month = String(date.getMonth() + 1).padStart(2, "0");
    year = String(date.getFullYear());
  }

  const currentYear = String(new Date().getFullYear());
  if (hideCurrentYear && year === currentYear) {
    return `${day}.${month}.`;
  }

  return `${day}.${month}.${year}`;
};

export const formatShortDate = (
  dateString: string | Date | null | undefined,
) => formatDate(dateString, true);