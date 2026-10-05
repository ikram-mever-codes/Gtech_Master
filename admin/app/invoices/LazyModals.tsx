"use client";

import dynamic from "next/dynamic";

/**
 * Every modal on the /invoices page is only rendered while its `show*`
 * flag is true, but the original page imported them all statically (plus
 * react-select via the Reassign/Split modals, SpreadSheet, etc.), so their
 * code shipped in the first-load bundle of every tab.
 *
 * next/dynamic with ssr:false defers each modal's module until it is first
 * opened. Same components, same props — only loaded later. Mirrors
 * app/commercial/LazyModals.tsx.
 */

// Default-export modals owned by this page.
export const InvoiceDetailsModal = dynamic(
  () => import("./InvoiceDetailsModal"),
  { ssr: false },
);

export const OrderFormModal = dynamic(() => import("./OrderFormModal"), {
  ssr: false,
});

export const OrderDetailsModal = dynamic(
  () => import("@/components/orders/OrderDetailsModal"),
  { ssr: false },
);

// Named exports from the shared commercial order-item actions module. The
// inline Taric / Qty modals in the old invoices page were identical to
// commercial's TaricModal / QtyModal, so those are reused instead of kept
// as a second copy.
export const ReassignModal = dynamic(
  () => import("../commercial/orderitemactionsmodal").then((m) => m.ReassignModal),
  { ssr: false },
);

export const SplitModal = dynamic(
  () => import("../commercial/orderitemactionsmodal").then((m) => m.SplitModal),
  { ssr: false },
);

export const TaricModal = dynamic(
  () => import("../commercial/orderitemactionsmodal").then((m) => m.TaricModal),
  { ssr: false },
);

export const QtyModal = dynamic(
  () => import("../commercial/orderitemactionsmodal").then((m) => m.QtyModal),
  { ssr: false },
);
