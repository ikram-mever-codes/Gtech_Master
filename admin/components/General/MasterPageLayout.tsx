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
    <div className="w-full mx-auto">
      <div
        className="bg-white min-h-[80vh] rounded-lg shadow-sm pb-8 p-6 space-y-6"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <PageHeader title={showSettingsTabs ? "Settings" : title} icon={showSettingsTabs ? SettingsIcon : icon} />
          {actionButtons && <div className="flex items-center gap-3">{actionButtons}</div>}
        </div>
        {showSettingsTabs && <SettingsTabs />}
        {filterBar && (
          <div className="p-3 bg-white border border-gray-200 rounded-md shadow-sm">
            {filterBar}
          </div>
        )}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
          {tableContent}
        </div>
        {modalContent}
      </div>
    </div>
  );
}
