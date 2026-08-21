"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { OfferDetailModal as OfferDetailModalType } from "../../components/Offers/OfferDetailModal";

/**
 * Every one of these modals is only rendered when its `show*Modal` flag is
 * true — but the original page imported them all statically, so their code
 * (react-select instances, SpreadSheet, DocumentLineItemsSubTable, etc.)
 * shipped in the initial JS bundle for every tab, including "Angebot",
 * which needs none of them on first load.
 *
 * next/dynamic with ssr:false defers each modal's module to the moment it's
 * actually opened. No behavior change, no prop change — same component,
 * loaded later. Swap the static imports in the page for these.
 */

type OfferDetailModalProps = ComponentProps<typeof OfferDetailModalType>;

const OfferDetailModalInner = dynamic(
  () =>
    import("../../components/Offers/OfferDetailModal").then(
      (m) => m.OfferDetailModal,
    ),
  { ssr: false },
);

export const OfferDetailModalLazy: React.FC<OfferDetailModalProps> = (
  props,
) => <OfferDetailModalInner {...props} />;

export const AuftragToBestellungModal = dynamic(
  () => import("@/components/orders/AuftragToBestellungModal"),
  { ssr: false },
);

export const AuftragCreateModal = dynamic(
  () => import("@/components/orders/AuftragCreateModal"),
  { ssr: false },
);

export const AuftragToRechnungModal = dynamic(
  () => import("@/components/orders/AuftragToRechnungModal"),
  { ssr: false },
);

export const RechnungOhneAusliefernModal = dynamic(
  () => import("@/components/orders/RechnungOhneAusliefernModal"),
  { ssr: false },
);


export const RechnungDetailModal = dynamic(
  () => import("@/components/orders/RechnungDetailModal"),
  { ssr: false },
);

export const LieferscheinDetailModal = dynamic(
  () => import("@/components/orders/LieferscheinDetailModal"),
  { ssr: false },
);

export const AuftragPreviewModal = dynamic(
  () => import("@/components/orders/AuftragPreviewModal"),
  { ssr: false },
);

export const BestellungPreviewModal = dynamic(
  () => import("@/components/orders/BestellungPreviewModal"),
  { ssr: false },
);

export const InvoiceDetailsModal = dynamic(
  () => import("./InvoiceDetailsModel"),
  { ssr: false },
);

export const OrderFormModal = dynamic(() => import("./OrderFormModal"), {
  ssr: false,
});

export const ReassignModal = dynamic(
  () => import("./orderitemactionsmodal").then((m) => m.ReassignModal),
  { ssr: false },
);

export const SplitModal = dynamic(
  () => import("./orderitemactionsmodal").then((m) => m.SplitModal),
  { ssr: false },
);

export const TaricModal = dynamic(
  () => import("./orderitemactionsmodal").then((m) => m.TaricModal),
  { ssr: false },
);

export const QtyModal = dynamic(
  () => import("./orderitemactionsmodal").then((m) => m.QtyModal),
  { ssr: false },
);

export const PaymentInboundModal = dynamic(
  () => import("./PaymentInboundModal"),
  { ssr: false },
);
