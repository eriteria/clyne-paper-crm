"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

// Configure NProgress
NProgress.configure({
  minimum: 0.3,
  easing: "ease",
  speed: 500,
  showSpinner: false,
  trickleSpeed: 200,
});

export default function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle clicks on links to start progress bar
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (
        link &&
        link.href &&
        !link.href.startsWith("mailto:") &&
        !link.href.startsWith("tel:")
      ) {
        const url = new URL(link.href);
        const currentUrl = new URL(window.location.href);

        // Only show progress bar for different pages
        if (
          url.pathname !== currentUrl.pathname ||
          url.search !== currentUrl.search
        ) {
          NProgress.start();
        }
      }
    };

    // Handle form submissions
    const handleFormSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (form.method === "get") {
        NProgress.start();
      }
    };

    document.addEventListener("click", handleLinkClick);
    document.addEventListener("submit", handleFormSubmit);

    return () => {
      document.removeEventListener("click", handleLinkClick);
      document.removeEventListener("submit", handleFormSubmit);
    };
  }, []);

  useEffect(() => {
    // Complete progress bar on route change
    NProgress.done();
  }, [pathname, searchParams]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      NProgress.done();
    };
  }, []);

  return null;
}
