"use client";
import React, { Suspense } from "react";
import { SuppliersPage } from "@/components/Supplier/SuppliersPage";

export default function SuppliersPageWithSuspense() {
    return (
        <Suspense fallback={
            <div className="p-20 flex justify-center items-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#8CC21B]" />
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <SuppliersPage />
        </Suspense>
    );
}
