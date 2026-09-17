export const getItemLink = (item: any): string | undefined => {
  if (!item) return undefined;

  const isDraftItem =
    item.isDraft === true ||
    item.is_draft === true ||
    item.isDraft === "Yes" ||
    item.is_draft === "Yes" ||
    item.sourceType === "inquiry" ||
    Boolean(item.inquiryId) ||
    Boolean(item.requestId);

  const masterId =
    item.sourceItemId ||
    item.source_item_id ||
    item.itemId ||
    item.item_id ||
    item.masterItemId ||
    item.item?.id ||
    item.requestId ||
    item.id;

  if (!masterId) return undefined;

  if (isDraftItem) {
    return `/inquiry?requestId=${masterId}`;
  }
  return `/items?itemId=${masterId}`;
};

export const getCustomerLink = (customerId: string | number | null | undefined): string | undefined => {
  if (!customerId) return undefined;
  return `/bussinesses?businessId=${encodeURIComponent(String(customerId))}`;
};