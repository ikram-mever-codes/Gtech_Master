export const formatDate = (dateString: string | Date | null | undefined) => {
  if (!dateString || dateString === "0000-00-00 00:00:00") return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  
  const currentYear = new Date().getFullYear();
  const dateYear = date.getFullYear();
  
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  
  if (dateYear === currentYear) {
    return `${day}.${month}.`;
  }
  return `${day}.${month}.${dateYear}`;
};
