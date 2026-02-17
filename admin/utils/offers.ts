import { calculateLineItemTotal, formatCurrency } from "@/api/offers";
import toast from "react-hot-toast";

// Format date
export const formatDate = (dateString: string | Date) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
// Helper function to generate HTML email content for an offer
export const generateOfferEmailHTML = (offer: any): string => {
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Helper to format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Generate HTML table rows for line items
  const generateLineItemsTable = () => {
    if (!offer.lineItems || offer.lineItems.length === 0) {
      return "<tr><td colspan='4' style='padding: 8px; text-align: center;'>No items</td></tr>";
    }

    return offer.lineItems
      .filter((item: any) => !item.isComponent)
      .map((item: any) => {
        // Determine price display based on offer type
        let priceDisplay = "";
        if (offer.useUnitPrices && item.unitPrices?.length > 0) {
          const activePrice =
            item.unitPrices.find((up: any) => up.isActive) ||
            item.unitPrices[0];
          priceDisplay = `${activePrice.quantity} pcs × ${formatCurrency(activePrice.unitPrice, offer.currency)}`;
        } else if (item.quantityPrices?.length > 0) {
          const activePrice =
            item.quantityPrices.find((qp: any) => qp.isActive) ||
            item.quantityPrices[0];
          priceDisplay = `${activePrice.quantity} pcs × ${formatCurrency(activePrice.price, offer.currency)}`;
        } else if (item.basePrice) {
          priceDisplay = `${item.baseQuantity || "1"} pcs × ${formatCurrency(item.basePrice, offer.currency)}`;
        } else {
          priceDisplay = "Price on request";
        }

        const total = calculateLineItemTotal(item, offer.useUnitPrices) || 0;

        return `
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 8px; text-align: center;">${item.position}</td>
            <td style="padding: 8px;">
              <strong>${item.itemName}</strong>
              ${item.description ? `<br/><span style="color: #666; font-size: 0.9em;">${item.description}</span>` : ""}
            </td>
            <td style="padding: 8px;">${priceDisplay}</td>
            <td style="padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(total, offer.currency)}</td>
          </tr>
        `;
      })
      .join("");
  };

  // Calculate totals
  const subtotal = offer.subtotal || 0;
  const discount = offer.discountAmount || 0;
  const shipping = offer.shippingCost || 0;
  const tax = offer.taxAmount || 0;
  const total = offer.totalAmount || 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .offer-title { font-size: 24px; font-weight: bold; color: #333; margin: 0; }
        .offer-number { color: #666; font-size: 14px; margin-top: 5px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #f5f5f5; font-weight: bold; text-align: left; padding: 8px; border-bottom: 2px solid #ddd; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        .totals-table { width: 300px; margin-left: auto; }
        .totals-table td { padding: 5px; border: none; }
        .totals-table .total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #333; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 15px; }
        .status-badge { display: inline-block; padding: 4px 8px; background-color: #e0e0e0; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .customer-info { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .highlight { color: #2c3e50; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1 class="offer-title">${offer.title || "Offer"}</h1>
          <div class="offer-number">
            Offer #${offer.offerNumber} | Revision ${offer.revision || 1} | Created: ${formatDate(offer.createdAt)}
          </div>
          <div style="margin-top: 10px;">
            <span class="status-badge" style="background-color: ${getStatusColor(offer.status)}">${offer.status}</span>
            ${offer.useUnitPrices ? '<span class="status-badge" style="background-color: #27ae60; color: white; margin-left: 5px;">Unit Pricing</span>' : ""}
          </div>
        </div>

        <!-- Customer Information -->
        <div class="section">
          <h2 class="section-title">Customer Information</h2>
          <div class="customer-info">
            <table style="width: 100%; border: none;">
              <tr>
                <td style="border: none; width: 50%;">
                  <strong>${offer.customerSnapshot?.companyName || "N/A"}</strong><br/>
                  ${offer.customerSnapshot?.legalName ? `${offer.customerSnapshot.legalName}<br/>` : ""}
                  ${offer.customerSnapshot?.address || ""}<br/>
                  ${offer.customerSnapshot?.postalCode || ""} ${offer.customerSnapshot?.city || ""}<br/>
                  ${offer.customerSnapshot?.country || ""}<br/>
                  ${offer.customerSnapshot?.vatId ? `VAT: ${offer.customerSnapshot.vatId}` : ""}
                </td>
                <td style="border: none; vertical-align: top;">
                  <strong>Delivery Address</strong><br/>
                  ${offer.deliveryAddress?.contactName || ""}<br/>
                  ${offer.deliveryAddress?.street || ""}<br/>
                  ${offer.deliveryAddress?.postalCode || ""} ${offer.deliveryAddress?.city || ""}<br/>
                  ${offer.deliveryAddress?.country || ""}<br/>
                  ${offer.deliveryAddress?.contactPhone ? `Tel: ${offer.deliveryAddress.contactPhone}` : ""}
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Line Items -->
        <div class="section">
          <h2 class="section-title">Offer Details</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">Pos</th>
                <th style="width: 45%;">Description</th>
                <th style="width: 30%;">Price</th>
                <th style="width: 20%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${generateLineItemsTable()}
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="section">
          <table class="totals-table">
            <tr>
              <td style="text-align: right;">Subtotal:</td>
              <td style="text-align: right;">${formatCurrency(subtotal, offer.currency)}</td>
            </tr>
            ${
              discount > 0
                ? `
            <tr>
              <td style="text-align: right; color: #e74c3c;">Discount:</td>
              <td style="text-align: right; color: #e74c3c;">-${formatCurrency(discount, offer.currency)}</td>
            </tr>`
                : ""
            }
            ${
              shipping > 0
                ? `
            <tr>
              <td style="text-align: right;">Shipping:</td>
              <td style="text-align: right;">${formatCurrency(shipping, offer.currency)}</td>
            </tr>`
                : ""
            }
            <tr>
              <td style="text-align: right;">VAT:</td>
              <td style="text-align: right;">${formatCurrency(tax, offer.currency)}</td>
            </tr>
            <tr class="total-row">
              <td style="text-align: right; font-size: 18px;">TOTAL:</td>
              <td style="text-align: right; font-size: 18px; font-weight: bold;">${formatCurrency(total, offer.currency)}</td>
            </tr>
          </table>
        </div>

        <!-- Terms & Conditions -->
        ${
          offer.termsConditions || offer.paymentTerms || offer.deliveryTerms
            ? `
        <div class="section">
          <h2 class="section-title">Terms & Conditions</h2>
          <table style="width: 100%;">
            ${
              offer.paymentTerms
                ? `
            <tr>
              <td style="border: none; width: 120px;"><strong>Payment Terms:</strong></td>
              <td style="border: none;">${offer.paymentTerms}</td>
            </tr>`
                : ""
            }
            ${
              offer.deliveryTerms
                ? `
            <tr>
              <td style="border: none;"><strong>Delivery Terms:</strong></td>
              <td style="border: none;">${offer.deliveryTerms}</td>
            </tr>`
                : ""
            }
            ${
              offer.deliveryTime
                ? `
            <tr>
              <td style="border: none;"><strong>Delivery Time:</strong></td>
              <td style="border: none;">${offer.deliveryTime}</td>
            </tr>`
                : ""
            }
            ${
              offer.termsConditions
                ? `
            <tr>
              <td style="border: none;"><strong>Additional Terms:</strong></td>
              <td style="border: none;">${offer.termsConditions}</td>
            </tr>`
                : ""
            }
          </table>
        </div>`
            : ""
        }

        <!-- Notes -->
        ${
          offer.notes
            ? `
        <div class="section">
          <h2 class="section-title">Notes</h2>
          <p style="background-color: #f9f9f9; padding: 10px; border-radius: 5px;">${offer.notes.replace(/\n/g, "<br/>")}</p>
        </div>`
            : ""
        }

        <!-- Footer -->
        <div class="footer">
          <p>This offer was created on ${formatDate(offer.createdAt)} and is valid until ${formatDate(offer.validUntil)}.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Helper function to get status color
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: "#95a5a6",
    sent: "#3498db",
    accepted: "#27ae60",
    rejected: "#e74c3c",
    expired: "#7f8c8d",
    revised: "#f39c12",
  };
  return colors[status?.toLowerCase()] || "#95a5a6";
};

export const openOutlookWithOffer = (offer: any) => {
  try {
    const htmlContent = generateOfferEmailHTML(offer);

    const to = offer.customerSnapshot?.email || "";
    const subject = encodeURIComponent(
      `Offer ${offer.offerNumber}: ${offer.title || "New Offer"}`,
    );

    const plainText = `Please find attached offer ${offer.offerNumber} for your review.\n\nTotal Amount: ${formatCurrency(offer.totalAmount || 0, offer.currency)}\n\nThis offer is valid until ${formatDate(offer.validUntil)}.`;

    const body = encodeURIComponent(`<html><body>${htmlContent}</body></html>`);

    const mailtoLink = `mailto:${to}?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;

    toast.success("Opening email client...");
  } catch (error) {
    console.error("Error opening email client:", error);
    toast.error("Failed to open email client");
  }
};
