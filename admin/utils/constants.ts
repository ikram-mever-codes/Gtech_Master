export const BASE_URL = "http://localhost:1000/api/v1";
//export const BASE_URL = "https://api.gtech.de/api/v1";

export const successStyles = {
  style: {
    maxWidth: "50rem",
    backgroundColor: "#10B981",
    color: "#FFFFFF",
    borderRadius: "12px",
    padding: "12px 16px",
    fontFamily: "Poppins, sans-serif",
    fontSize: "0.875rem",
    fontWeight: 600,
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
    zIndex: 99999,
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
    fontFamily: "Poppins, sans-serif",
    fontSize: "0.875rem",
    fontWeight: 600,
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
    zIndex: 99999,
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
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
    border: "1px solid #E5E7EB",
    borderRadius: "12px",
    padding: "12px 16px",
    fontFamily: "Poppins, sans-serif",
    fontSize: "0.875rem",
    fontWeight: 600,
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
    zIndex: 99999,
  },
  iconTheme: {
    primary: "#8CC21B",
    secondary: "#F3F4F6",
  },
};

export const themeColors = {
  primary: "#102634",
  active: "#ec8ed3ff",
  button: "#319FD4",
  buttonHover: "#2678A6",
  text: "#333333",
  text2: "#65676B",
  background: "#E5E9F0",
  gentleBorder: "#CCD6DD",
  selected: "#F0F1F1",
};

export const getGelangenheitsUrl = (
  docPath: string | null | undefined
): string => {
  if (!docPath) return "";
  if (docPath.startsWith("http://") || docPath.startsWith("https://")) {
    return docPath;
  }
  const cleanPath = docPath.startsWith("/") ? docPath : `/${docPath}`;

  if (process.env.NEXT_PUBLIC_API_URL) {
    const origin = process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "").replace(
      /\/api\/v1.*$/,
      ""
    );
    return `${origin}${cleanPath}`;
  }

  if (typeof window !== "undefined") {
    if (window.location.hostname.includes("gtech.de")) {
      return `https://api.gtech.de${cleanPath}`;
    }
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return `http://localhost:1000${cleanPath}`;
    }
  }

  try {
    const apiOrigin = new URL(BASE_URL).origin;
    return `${apiOrigin}${cleanPath}`;
  } catch {
    return cleanPath;
  }
};

