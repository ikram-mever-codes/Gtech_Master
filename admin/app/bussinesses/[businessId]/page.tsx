"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function BusinessRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params?.businessId as string;

  useEffect(() => {
    if (businessId) {
      router.replace(`/bussinesses?businessId=${businessId}`);
    } else {
      router.replace("/bussinesses");
    }
  }, [businessId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-[#8CC21B] animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to Business Details...</p>
      </div>
    </div>
  );
}
