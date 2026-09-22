export const getItemLink = (item: any): string | undefined => {
  if (!item) return undefined;

  const catalogItemId =
    item.sourceItemId ||
    item.source_item_id ||
    item.itemId ||
    item.item_id ||
    item.masterItemId ||
    item.item?.id;

  if (catalogItemId) {
    return `/items?itemId=${catalogItemId}`;
  }

  const requestId = item.requestId || item.inquiryId;
  if (requestId) {
    return `/inquiry?requestId=${requestId}`;
  }

  if (item.id && !item.isFreetext) {
    return `/items?itemId=${item.id}`;
  }

  return undefined;
};
export const getCustomerLink = (customerId: string | number | null | undefined): string | undefined => {
  if (!customerId) return undefined;
  return `/bussinesses?businessId=${encodeURIComponent(String(customerId))}`;
};