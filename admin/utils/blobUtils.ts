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

export const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
};
