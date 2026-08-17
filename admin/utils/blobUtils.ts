/**
 * Utilities for handling binary blobs from API responses
 */

export const parseBlobError = async (blob: Blob): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(reader.result as string);
                resolve(json);
            } catch (e) {
                reject(new Error("Failed to parse error blob"));
            }
        };
        reader.onerror = () => reject(new Error("Failed to read blob"));
        reader.readAsText(blob);
    });
};

export const downloadBlob = (blob: Blob, filename: string, openInNewTab = true) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();

    if (openInNewTab && (blob.type === "application/pdf" || filename.toLowerCase().endsWith(".pdf"))) {
        window.open(url, "_blank");
    }

    setTimeout(() => {
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
    }, 60000);
};

export const getFilenameFromResponse = (
    response: any,
    fallbackName: string,
): string => {
    const cd =
        response?.headers?.["content-disposition"] ||
        response?.headers?.["Content-Disposition"];
    if (cd) {
        const utf8Match = cd.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match && utf8Match[1]) {
            return decodeURIComponent(utf8Match[1].replace(/["']/g, "")).trim();
        }
        const match = cd.match(/filename="?([^";]+)"?/i);
        if (match && match[1]) {
            return decodeURIComponent(match[1].replace(/["']/g, "")).trim();
        }
    }
    return fallbackName;
};