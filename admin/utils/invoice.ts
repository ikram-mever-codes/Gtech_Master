/**
 * Utility function to calculate the total price of an invoice consistently across the app.
 * Total = Item Subtotal + Freight Cost.
 */
export const calculateInvoiceTotal = (invoice: any): number => {
  if (!invoice) return 0;

  const freight = Number(invoice.freightCost ?? invoice.freight_cost ?? 0);
  const items = invoice.items || [];

  const itemsSum = items.reduce(
    (s: number, it: any) =>
      s +
      Number(it.quantity ?? it.qty ?? 0) *
        Number(
          it.unit_price ??
            it.unitPrice ??
            it.price ??
            it.net_price ??
            it.netPrice ??
            0,
        ),
    0,
  );

  if (itemsSum > 0) {
    return itemsSum + freight;
  }

  const gross = Number(invoice.grossTotal ?? invoice.gross_total ?? 0);
  if (gross > 0) {
    return Math.max(gross, freight);
  }

  return freight;
};
