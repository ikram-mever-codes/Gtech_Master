import React from "react";

/**
 * The compact Qty / Split / ReAssign button trio shown per order item in
 * the invoice row expansion and in the Invoice Details taric-group
 * expansion. Previously copy-pasted inline in both places.
 */
interface InvoiceItemActionButtonsProps {
  item: any;
  onOpenQtyModal: (item: any) => void;
  onOpenSplitModal: (item: any) => void;
  onOpenReassignModal: (item: any) => void;
}

const InvoiceItemActionButtons: React.FC<InvoiceItemActionButtonsProps> = ({
  item,
  onOpenQtyModal,
  onOpenSplitModal,
  onOpenReassignModal,
}) => (
  <div className="flex items-center justify-center gap-1">
    <button onClick={(e) => { e.stopPropagation(); onOpenQtyModal(item); }} className="px-2 py-1 text-[9px] font-bold bg-[#495057] text-white rounded hover:bg-[#343A40] transition" title="QtyLabel">Qty</button>
    <button onClick={(e) => { e.stopPropagation(); onOpenSplitModal(item); }} className="px-2 py-1 text-[9px] font-bold bg-[#F15A24] text-white rounded hover:bg-[#D9481B] transition" title="Split">Split</button>
    <button onClick={(e) => { e.stopPropagation(); onOpenReassignModal(item); }} className="px-2 py-1 text-[9px] font-bold bg-[#4F46E5] text-white rounded hover:bg-[#4338CA] transition" title="ReAssign">ReAssign</button>
  </div>
);

export default InvoiceItemActionButtons;
