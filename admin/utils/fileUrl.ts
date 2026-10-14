import { BASE_URL } from "./constants";

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