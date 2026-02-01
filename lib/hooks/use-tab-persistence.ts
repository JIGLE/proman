import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

/**
 * Hook for persisting tab state across page reloads
 * Stores state in both localStorage and URL query params
 * 
 * @param moduleId - Unique identifier for the module (e.g., 'properties', 'financials')
 * @param defaultTab - Default tab to show if none is selected
 * @returns [activeTab, setActiveTab] tuple
 */
export function useTabPersistence(moduleId: string, defaultTab: string): [string, (tab: string) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Get initial tab from URL or localStorage or default
  const getInitialTab = useCallback(() => {
    // First check URL params
    const urlTab = searchParams.get('view');
    if (urlTab) return urlTab;
    
    // Then check localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`tab-${moduleId}`);
      if (stored) return stored;
    }
    
    return defaultTab;
  }, [searchParams, moduleId, defaultTab]);

  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);

  // Update both URL and localStorage when tab changes
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tab-${moduleId}`, tab);
    }
    
    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [moduleId, searchParams, router, pathname]);

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get('view');
    if (urlTab && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    }
  }, [searchParams, activeTab]);

  return [activeTab, setActiveTab];
}
