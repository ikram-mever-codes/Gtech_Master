import { getGelangenheitsUrl } from "@/utils/fileUrl";

export type LabelFile = { name: string; url: string };

const dataUrlToBlobUrl = (dataUrl: string): string | null => {
  try {
    const [head, body] = dataUrl.split(",");
    const mime = head.match(/:(.*?);/)?.[1] || "application/pdf";
    const bstr = atob(body);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return URL.createObjectURL(new Blob([u8], { type: mime }));
  } catch (e) {
    console.error("Failed to convert data URL", e);
    return null;
  }
};

const resolveLabelUrl = (
  label: LabelFile,
): { url: string; revoke: boolean } => {
  if (label.url.startsWith("data:")) {
    const blobUrl = dataUrlToBlobUrl(label.url);
    if (blobUrl) return { url: blobUrl, revoke: true };
  }
  const url =
    label.url.startsWith("/") || label.url.startsWith("uploads/")
      ? getGelangenheitsUrl(label.url)
      : label.url;
  return { url, revoke: false };
};

export const openLabel = (label: LabelFile, targetWin?: Window | null) => {
  if (!label?.url) return;
  const { url, revoke } = resolveLabelUrl(label);
  if (targetWin && !targetWin.closed) targetWin.location.href = url;
  else window.open(url, "_blank");
  if (revoke) setTimeout(() => URL.revokeObjectURL(url), 60000);
};

export const downloadLabel = (label: LabelFile) => {
  if (!label?.url) return;
  const { url, revoke } = resolveLabelUrl(label);
  const a = document.createElement("a");
  a.href = url;
  a.download = label.name || "shipping_label.pdf";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    if (revoke) URL.revokeObjectURL(url);
  }, 1000);
};
