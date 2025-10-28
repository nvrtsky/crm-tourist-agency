import { useEffect, useState } from "react";

interface Bitrix24Context {
  entityId: string | null;
  entityTypeId: string | null;
  domain: string | null;
  memberId: string | null;
  accessToken: string | null;
  expiresIn: number | null;
  isReady: boolean;
  error: string | null;
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

function loadBitrix24Script(): Promise<void> {
  return new Promise((resolve, reject) => {
    // BX24 should already be loaded from <script> tag in index.html
    // Just wait for it to be available
    if (window.BX24) {
      console.log('✅ Bitrix24 SDK уже загружен');
      resolve();
      return;
    }

    // Wait for SDK to load (it's in HTML <script> tag)
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds total
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window.BX24) {
        clearInterval(checkInterval);
        console.log('✅ Bitrix24 SDK обнаружен после', attempts * 100, 'ms');
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error('❌ Bitrix24 SDK не загрузился после', attempts * 100, 'ms');
        console.error('Проверьте: 1) Приложение открыто из Bitrix24, 2) Нет блокировки скриптов, 3) Есть интернет');
        reject(new Error('Bitrix24 SDK не загрузился. Откройте приложение из Bitrix24.'));
      } else if (attempts % 10 === 0) {
        // Лог каждую секунду
        console.log(`⏳ Ожидание загрузки BX24... (${attempts * 100}ms)`);
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
    
    const initializeBX24 = () => {
      if (!window.BX24) {
        return;
      }

    window.BX24.init(() => {
      try {
        const placementInfo = window.BX24!.placement.info();
        const auth = window.BX24!.getAuth();
        const domain = auth.domain || window.BX24!.getDomain();
        
        // DIAGNOSTIC: Log what Bitrix24 provides
        console.log('🔍 BITRIX24 DIAGNOSTIC INFO:', {
          placement: placementInfo?.placement,
          options: placementInfo?.options,
          allFields: placementInfo,
          parentUrl: document.referrer,
          iframeUrl: window.location.href
        });
        
        // Try multiple possible field names for Smart Process
        let entityId = null;
        let entityTypeId = null;

        // Method 0: Extract from parent URL (document.referrer)
        // The parent Bitrix24 page URL contains the entity ID
        // URL format: .../176/details/3039/ or similar - we want the LAST number before query string
        if (document.referrer) {
          // Extract path part (before query string)
          const urlPath = document.referrer.split('?')[0];
          // Match all numbers in the path, take the last one
          const allNumbers = urlPath.match(/\/(\d+)/g);
          if (allNumbers && allNumbers.length > 0) {
            // Get the last number (most likely the entity ID)
            const lastNumber = allNumbers[allNumbers.length - 1];
            entityId = lastNumber.replace('/', '');
            console.log('✓ Found entityId in parent URL (document.referrer):', entityId);
          }
        }

        // Method 1: Check options.ID (основной метод для Smart Process)
        if (!entityId && placementInfo?.options?.ID) {
          entityId = String(placementInfo.options.ID);
        }

        // Method 2: Check options.ITEM_ID (альтернатива для Smart Process)
        if (!entityId && placementInfo?.options?.ITEM_ID) {
          entityId = String(placementInfo.options.ITEM_ID);
        }

        // Method 3: Check options.ELEMENT_ID
        if (!entityId && placementInfo?.options?.ELEMENT_ID) {
          entityId = String(placementInfo.options.ELEMENT_ID);
        }

        // Method 4: Check options.ENTITY_ID
        if (!entityId && placementInfo?.options?.ENTITY_ID) {
          entityId = String(placementInfo.options.ENTITY_ID);
        }

        // Method 5: Check lowercase variants
        if (!entityId && placementInfo?.options?.id) {
          entityId = String(placementInfo.options.id);
        }

        // Method 6: Check root level fields
        if (!entityId && placementInfo?.entityId) {
          entityId = String(placementInfo.entityId);
        }

        // Method 7: Check DEAL_ID for compatibility
        if (!entityId && placementInfo?.options?.DEAL_ID) {
          entityId = String(placementInfo.options.DEAL_ID);
        }

        // Entity Type ID checks
        // Extract from placement name: "CRM_DYNAMIC_176_DETAIL_TAB" -> entityTypeId = "176"
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

        // If no entityId found, show error without fallback
        let errorMessage = null;

        if (!entityId) {
          errorMessage = `ID элемента Smart Process не найден.

Возможные причины:
1. Приложение открыто НЕ из карточки Smart Process "Событие"
2. Неправильно настроен placement в Bitrix24
3. Отсутствуют необходимые права доступа

Инструкции для решения:
✓ Откройте приложение из карточки Smart Process (элемент "Событие")
✓ Убедитесь, что placement настроен как "CRM_DYNAMIC_176_DETAIL_TAB"
✓ Проверьте консоль браузера (F12) для диагностики
✓ При необходимости переустановите приложение через /install.html`;
        }

        setContext({
          entityId,
          entityTypeId,
          domain,
          memberId: auth.member_id || null,
          accessToken: auth.access_token || null,
          expiresIn: auth.expires_in || null,
          isReady: true,
          error: errorMessage,
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
