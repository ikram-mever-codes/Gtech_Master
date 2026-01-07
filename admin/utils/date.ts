export default function formatDate(
  date: Date,
  includeCurrentYear: boolean = false
): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const targetYear = date.getFullYear();

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const showYear = targetYear !== currentYear || includeCurrentYear;

  return showYear ? `${day}.${month}.${targetYear}` : `${day}.${month}.`;
}
