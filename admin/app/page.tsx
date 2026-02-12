"use client";
import { useRouter } from "next/navigation";
import React from "react";

const page = () => {
  const router = useRouter();

  React.useEffect(() => {
    router.push("/scheduled");
  }, [router]);

  return null;
};

export default page;
