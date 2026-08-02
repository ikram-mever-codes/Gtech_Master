"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const SETTINGS_TABS = [
  {
    id: "tags",
    label: "Tags",
    href: "/tags",
  },
  {
    id: "payment-methods",
    label: "PaymentMethods",
    href: "/payment-methods",
  },
  {
    id: "shipping-methods",
    label: "Shipmentmethods",
    href: "/shipping-methods",
  },
  {
    id: "tax-profiles",
    label: "TaxProfiles",
    href: "/tax-profiles",
  },
  {
    id: "users",
    label: "Users",
    href: "/users",
  },
  {
    id: "numbers",
    label: "Numbers",
    href: "/numbers",
  },
  {
    id: "countries",
    label: "Countries",
    href: "/countries",
  },
  {
    id: "gtech-companies",
    label: "GTech Companies",
    href: "/gtech-companies",
  },
  {
    id: "parameters-templates",
    label: "Parameters & Templates",
    href: "/parameters-templates",
  },
];

export default function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex overflow-x-auto border-b border-gray-100 pb-px mb-2 select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {SETTINGS_TABS.map((tab) => {
        const isActive =
          pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap -mb-px ${isActive
              ? "text-[#8CC21B] border-b-2 border-[#8CC21B]"
              : "text-gray-500 hover:text-gray-900 border-b-2 border-transparent"
              }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
