export const formatDate = (dateString: string | Date | null | undefined) => {
  if (!dateString || dateString === "0000-00-00 00:00:00") return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};
