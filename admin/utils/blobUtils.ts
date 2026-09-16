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
        const encodedName = encodeURIComponent(filename);
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${filename}</title>
    <style>
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #525659; }
        embed, iframe, object { width: 100%; height: 100%; border: none; }
    </style>
</head>
<body>
    <embed src="${url}#name=${encodedName}&filename=${encodedName}&title=${encodedName}" type="application/pdf" width="100%" height="100%" />
</body>
</html>`;
        const htmlBlob = new Blob([htmlContent], { type: "text/html" });
        const htmlUrl = window.URL.createObjectURL(htmlBlob);
        window.open(htmlUrl, "_blank");
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
