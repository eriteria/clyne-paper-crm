import { useEffect } from "react";

/**
 * Custom hook to set the page title
 * @param title - The page title (will be suffixed with " - Clyne Paper CRM")
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} - Clyne Paper CRM`;
    
    // Cleanup: reset to default title when component unmounts
    return () => {
      document.title = "Clyne Paper CRM";
    };
  }, [title]);
}
