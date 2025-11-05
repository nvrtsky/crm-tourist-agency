import { useEffect, useState } from "react";

interface DiagnosticInfo {
  pathname: string;
  referrer: string;
  options: any;
  placement: string;
  windowName?: string;
  extractionMethod?: string;
}

interface Bitrix24Context {
  entityId: string | null;
  entityTypeId: string | null;
  domain: string | null;
  memberId: string | null;
  accessToken: string | null;
  expiresIn: number | null;
  isReady: boolean;
  error: string | null;
  diagnosticInfo?: DiagnosticInfo;
}

declare global {
  interface Window {
    BX24?: {
      init: (callback: () => void) => void;
      placement: {
        info: () => {
          options?: {
            ID?: string;
            ENTITY_ID?: string;
            ENTITY_TYPE_ID?: string;
            ITEM_ID?: string;
            ELEMENT_ID?: string;
            DEAL_ID?: string;
            id?: string;
            [key: string]: any;
          };
          entityId?: string;
          entityTypeId?: string;
          placement?: string;
          [key: string]: any; // Allow any additional fields
        };
      };
      getDomain: () => string;
      getLang: () => string;
      isAdmin: () => boolean;
      getAuth: () => {
        access_token?: string;
        expires_in?: number;
        member_id?: string;
        domain?: string;
      };
      callMethod: (
        method: string,
        params: Record<string, any>,
        callback?: (result: any) => void
      ) => void;
      resizeWindow: (width: number, height: number) => void;
      installFinish?: () => void;
    };
  }
}

// Helper function to extract entityId from document.referrer
// Bitrix24 often provides the element ID in the referrer URL like:
// https://mitclick.bitrix24.ru/crm/type/176/details/303/?IFRAME=Y&IFRAME_TYPE=SIDE_SLIDER
function extractIdFromReferrer(ref: string): string | null {
  try {
    if (!ref) return null;
    const url = new URL(ref);
    const pathname = url.pathname;
    
    // PRIORITY 1: Try to match /details/{id}/ pattern specifically
    // This is the most reliable pattern for Bitrix24 Smart Process URLs
    const detailsMatch = pathname.match(/\/details\/(\d+)/);
    if (detailsMatch && detailsMatch[1]) {
      return detailsMatch[1]; // e.g., "303"
    }
    
    // PRIORITY 2: Fallback - split pathname and find the first numeric value from the end
    const parts = pathname.split('/').filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(parts[i])) {
        return parts[i]; // e.g., "127", "303"
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

function loadBitrix24Script(): Promise<void> {
  return new Promise((resolve, reject) => {
    // BX24 should already be loaded from <script> tag in index.html
    // Just wait for it to be available
    if (window.BX24) {
      resolve();
      return;
    }

    // Wait for SDK to load (it's in HTML <script> tag)
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds total
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window.BX24) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error('Bitrix24 SDK не загрузился. Откройте приложение из Bitrix24.'));
      }
    }, 100);
  });
}

export function useBitrix24(): Bitrix24Context {
  const [context, setContext] = useState<Bitrix24Context>({
    entityId: null,
    entityTypeId: null,
    domain: null,
    memberId: null,
    accessToken: null,
    expiresIn: null,
    isReady: false,
    error: null,
  });

  useEffect(() => {
    // Check if we're in demo mode - don't try to load Bitrix24 SDK
    const isDemoMode = typeof window !== 'undefined' && window.location.pathname.startsWith('/demo');
    
    if (isDemoMode) {
      // In demo mode, return mock context immediately
      setContext({
        entityId: "DEMO-001",
        entityTypeId: "176",
        domain: "demo.bitrix24.ru",
        memberId: "demo-member",
        accessToken: null,
        expiresIn: null,
        isReady: true,
        error: null,
      });
      return;
    }
    
    // Try to load Bitrix24 SDK if not present
    const initializeBitrix = async () => {
      try {
        // Wait for script to load if not present
        if (!window.BX24) {
          await loadBitrix24Script();
          // Wait a bit for BX24 to initialize
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!window.BX24) {
          throw new Error("Bitrix24 SDK не загружен");
        }
        
        // Continue with normal initialization
        initializeBX24();
      } catch (error) {
        console.error("❌ Ошибка загрузки Bitrix24 SDK:", error);
        setContext((prev) => ({
          ...prev,
          error: "Bitrix24 SDK не может быть загружен. Откройте приложение из Bitrix24.",
          isReady: true,
        }));
      }
    };
    
    // Helper function to extract entityId from various sources
    const tryExtractEntityId = (source: string, attempt: number = 1): { entityId: string | null; extractionMethod: string } => {
      let entityId: string | null = null;
      let extractionMethod = '';

      // PRIORITY 0: Extract from iframe pathname (window.location.pathname)
      // URL format: "179/" or "179/?IFRAME=Y&IFRAME_TYPE=SIDE_SLIDER"
      // This is THE MOST RELIABLE method for side-slider mode
      const pathname = window.location.pathname;
      const pathSegments = pathname.split('/').filter(Boolean);
      
      // Look for first numeric segment
      for (const segment of pathSegments) {
        if (/^\d+$/.test(segment)) {
          entityId = segment;
          extractionMethod = `window.location.pathname (сегмент "${segment}")`;
          break;
        }
      }

      // PRIORITY 1: Extract from URL query parameters
      if (!entityId) {
        const urlParams = new URLSearchParams(window.location.search);
        const possibleIdParams = ['ENTITY_ID', 'entityId', 'ID', 'id', 'ITEM_ID', 'itemId'];
        
        for (const param of possibleIdParams) {
          const value = urlParams.get(param);
          if (value && /^\d+$/.test(value)) {
            entityId = value;
            extractionMethod = `URL параметр "?${param}=${value}"`;
            break;
          }
        }
      }

      // PRIORITY 2: Check placementInfo.options
      if (!entityId && window.BX24) {
        const placementInfo = window.BX24.placement.info();
        
        if (placementInfo?.options && typeof placementInfo.options === 'object') {
          const options = placementInfo.options;
          const possibleFields = ['ID', 'ITEM_ID', 'ELEMENT_ID', 'ENTITY_ID', 'id', 'DEAL_ID'];
          
          for (const field of possibleFields) {
            if (options[field]) {
              entityId = String(options[field]);
              extractionMethod = `placementInfo.options.${field}`;
              break;
            }
          }
        }

        // Check root level entityId field
        if (!entityId && placementInfo?.entityId) {
          entityId = String(placementInfo.entityId);
          extractionMethod = 'placementInfo.entityId';
        }
      }

      // PRIORITY 3: Fallback to document.referrer
      // Используется как fallback если placement.info() не предоставил entityId
      // Bitrix24 URL format: https://portal.bitrix24.ru/crm/type/176/details/303/?IFRAME=Y...
      if (!entityId) {
        const refGuess = extractIdFromReferrer(document.referrer);
        if (refGuess) {
          entityId = refGuess;
          extractionMethod = `document.referrer`;
        }
      }

      return { entityId, extractionMethod };
    };

    // Function with retry logic
    const initializeBX24WithRetry = (attempt: number = 1) => {
      if (!window.BX24) {
        return;
      }

      window.BX24.init(() => {
        try {
          const placementInfo = window.BX24!.placement.info();
          const auth = window.BX24!.getAuth();
          const domain = auth.domain || window.BX24!.getDomain();

          // Extract entityTypeId from placement name
          let entityTypeId: string | null = null;
          if (placementInfo?.placement) {
            const typeMatch = placementInfo.placement.match(/CRM_DYNAMIC_(\d+)_DETAIL_TAB/);
            if (typeMatch && typeMatch[1]) {
              entityTypeId = typeMatch[1];
            }
          }

          if (!entityTypeId && placementInfo?.options?.ENTITY_TYPE_ID) {
            entityTypeId = String(placementInfo.options.ENTITY_TYPE_ID);
          }
          if (!entityTypeId && placementInfo?.entityTypeId) {
            entityTypeId = String(placementInfo.entityTypeId);
          }

          // Try to extract entityId
          const extractionResult = tryExtractEntityId('init', attempt);
          const entityId = extractionResult.entityId;
          const finalExtractionMethod = extractionResult.extractionMethod || 'не определён';

          // If no entityId found and we haven't tried 3 times yet, retry
          if (!entityId && attempt < 3) {
            setTimeout(() => {
              initializeBX24WithRetry(attempt + 1);
            }, 100);
            return;
          }

          // Set context with final result
          let errorMessage: string | null = null;
          if (!entityId) {
            errorMessage = `ID элемента Smart Process не найден после ${attempt} попыток.`;
          }

          // Prepare diagnostic info
          const diagnosticInfo: DiagnosticInfo = {
            pathname: window.location.pathname,
            referrer: document.referrer,
            options: placementInfo?.options || {},
            placement: placementInfo?.placement || '',
            windowName: window.name || undefined,
            extractionMethod: finalExtractionMethod
          };

          setContext({
            entityId,
            entityTypeId,
            domain,
            memberId: auth.member_id || null,
            accessToken: auth.access_token || null,
            expiresIn: auth.expires_in || null,
            isReady: true,
            error: errorMessage,
            diagnosticInfo,
          });

          // Auto-resize iframe
          if (window.BX24?.resizeWindow) {
            window.BX24.resizeWindow(window.innerWidth, window.innerHeight);
          }
        } catch (error) {
          console.error("❌ Ошибка инициализации Bitrix24:", error);
          setContext((prev) => ({
            ...prev,
            error: "Ошибка инициализации Bitrix24",
            isReady: true,
          }));
        }
      });
    };

    const initializeBX24 = () => {
      initializeBX24WithRetry(1);
    };
    
    // Start initialization
    initializeBitrix();
  }, []);

  return context;
}

export function callBitrix24Method(
  method: string,
  params: Record<string, any> = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!window.BX24) {
      reject(new Error("Bitrix24 SDK не загружен"));
      return;
    }

    window.BX24!.callMethod(method, params, (result: any) => {
      if (result.error()) {
        reject(new Error(result.error()));
      } else {
        resolve(result.data());
      }
    });
  });
}
