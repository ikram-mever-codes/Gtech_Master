export const formatDate = (dateString: string | Date | null | undefined) => {
  if (!dateString || dateString === "0000-00-00 00:00:00") return "—";
  if (typeof dateString === "string") {
    const trimmed = dateString.trim();
    const parts = trimmed.split(".");
    if (parts.length === 3 && parts[2].length === 4) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${day}.${month}.${year}`;
    }
    const dashParts = trimmed.split("T")[0].split("-");
    if (dashParts.length === 3 && dashParts[0].length === 4) {
      const year = dashParts[0];
      const month = dashParts[1].padStart(2, "0");
      const day = dashParts[2].padStart(2, "0");
      return `${day}.${month}.${year}`;
    }
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateYear = date.getFullYear();

  return `${day}.${month}.${dateYear}`;
};