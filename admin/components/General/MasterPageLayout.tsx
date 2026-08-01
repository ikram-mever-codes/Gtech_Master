import React from "react";
import PageHeader from "@/components/UI/PageHeader";
import SettingsTabs from "./SettingsTabs";
import { Settings as SettingsIcon } from "lucide-react";

interface MasterPageLayoutProps {
  title: string;
  icon: any;
  actionButtons?: React.ReactNode;
  filterBar?: React.ReactNode;
  tableContent: React.ReactNode;
  modalContent?: React.ReactNode;
  showSettingsTabs?: boolean;
}
export default function MasterPageLayout({
  title,
  icon,
  actionButtons,
  filterBar,
  tableContent,
  modalContent,
  showSettingsTabs = true,
}: MasterPageLayoutProps) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader title={showSettingsTabs ? "Settings" : title} icon={showSettingsTabs ? SettingsIcon : icon} />
        {actionButtons && <div className="flex items-center gap-3">{actionButtons}</div>}
      </div>
      {showSettingsTabs && <SettingsTabs />}
      {filterBar && (
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          {filterBar}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {tableContent}
      </div>
      {modalContent}
    </div>
  );
}
