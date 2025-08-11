// export const BASE_URL = "http://localhost:1000/api/v1";
export const BASE_URL = "https://api.gtech.de/api/v1";

export const successStyles = {
  style: {
    maxWidth: "50rem",
    backgroundColor: "#10B981",
    color: "#FFFFFF",
    borderRadius: "12px",
    padding: "12px 16px",
    fontFamily: "DM Sans, sans-serif",
    fontSize: "1rem",
    fontWeight: 500,
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
  },
  iconTheme: {
    primary: "#FFFFFF",
    secondary: "#10B981",
  },
};

export const errorStyles = {
  style: {
    maxWidth: "50rem",
    backgroundColor: "#EF4444",
    color: "#FFFFFF",
    borderRadius: "12px",
    padding: "12px 16px",
    fontFamily: "DM Sans, sans-serif",
    fontSize: "1rem",
    fontWeight: 500,
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
  },
  iconTheme: {
    primary: "#FFFFFF",
    secondary: "#EF4444",
  },
};

export const loadingStyles = {
  style: {
    maxWidth: "50rem",
    minWidth: "15rem",
    backgroundColor: "#3B82F6",
    color: "#FFFFFF",
    borderRadius: "8px",
    padding: "12px 16px",
    fontFamily: "DM Sans, sans-serif",
    fontSize: "1rem",
    fontWeight: 700,
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
  },
  iconTheme: {
    primary: "#FFFFFF",
    secondary: "#3B82F6",
  },
};

export const themeColors = {
  primary: "#102634",
  active: "#006FBA",
  button: "#319FD4",
  buttonHover: "#2678A6",
  text: "#333333",
  text2: "#65676B",
  background: "#E5E9F0",
  gentleBorder: "#CCD6DD",
  selected: "#F0F1F1",
};

// Utility function for formatting period labels
export function formatPeriodLabel(period: string, cargoNo: string): string {
  const monthMap: { [key: string]: string } = {
    "01": "Januar",
    "02": "Februar",
    "03": "März",
    "04": "April",
    "05": "Mai",
    "06": "Juni",
    "07": "Juli",
    "08": "August",
    "09": "September",
    "10": "Oktober",
    "11": "November",
    "12": "Dezember",
  };

  const [yearPart, periodNum] = period.split("-");
  const monthName = monthMap[periodNum] || `Period ${periodNum}`;

  return `Lieferung ${monthName} ${cargoNo}`;
}
