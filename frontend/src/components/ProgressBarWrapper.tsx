"use client";

import { Suspense } from "react";
import ProgressBarClient from "./ProgressBarClient";

export default function ProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarClient />
    </Suspense>
  );
}
