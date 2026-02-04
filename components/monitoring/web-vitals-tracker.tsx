"use client";

import { useEffect } from 'react';
import { trackWebVitals } from '@/lib/monitoring/performance';

/**
 * Web Vitals Tracker Component
 * 
 * Automatically tracks Core Web Vitals (LCP, FID, CLS)
 * and page performance metrics on the client-side.
 * 
 * Add this to your root layout to enable tracking.
 */
export function WebVitalsTracker(): null {
  useEffect(() => {
    // Initialize Web Vitals tracking
    trackWebVitals();
  }, []);

  return null;
}
