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
    // If BX24 already exists, resolve immediately
    if (window.BX24) {
      resolve();
      return;
    }

    // Try to load from default endpoint
    const script = document.createElement('script');
    script.src = '//api.bitrix24.com/api/v1/';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ Bitrix24 SDK loaded successfully');
      resolve();
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load Bitrix24 SDK');
      reject(new Error('Failed to load Bitrix24 SDK'));
    };
    
    document.head.appendChild(script);
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
    // Check if running in development mode (not in Bitrix24 iframe)
    if (import.meta.env.DEV && !window.BX24) {
      console.log("Running in development mode without Bitrix24");
      setContext({
        entityId: "dev-entity-123",
        entityTypeId: "dev-type-1",
        domain: "localhost",
        memberId: "dev-member",
        accessToken: "dev-token",
        expiresIn: 3600,
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
          throw new Error("Bitrix24 SDK не загружен после попытки загрузки");
        }
        
        // Continue with normal initialization
        initializeBX24();
      } catch (error) {
        console.error("❌ Ошибка загрузки Bitrix24 SDK:", error);
        setContext((prev) => ({
          ...prev,
          error: "Bitrix24 SDK не может быть загружен. Работаю в DEMO-режиме.",
          entityId: "demo-entity-" + Date.now(),
          entityTypeId: "demo-type-smart-process",
          domain: "demo",
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

        // Debug: Log full placement info structure with all available keys
        console.log("🔍 Bitrix24 Placement Info (полная структура):", JSON.stringify(placementInfo, null, 2));
        console.log("🔍 Available keys in placementInfo:", Object.keys(placementInfo || {}));
        console.log("🔍 Available keys in placementInfo.options:", Object.keys(placementInfo?.options || {}));
        console.log("🔍 Bitrix24 Auth Info:", JSON.stringify(auth, null, 2));
        
        // Try multiple possible field names for Smart Process
        let entityId = null;
        let entityTypeId = null;

        // Method 1: Check options.ID (основной метод для Smart Process)
        if (placementInfo?.options?.ID) {
          entityId = String(placementInfo.options.ID);
          console.log("✅ Found entityId in options.ID:", entityId);
        }

        // Method 2: Check options.ITEM_ID (альтернатива для Smart Process)
        if (!entityId && placementInfo?.options?.ITEM_ID) {
          entityId = String(placementInfo.options.ITEM_ID);
          console.log("✅ Found entityId in options.ITEM_ID:", entityId);
        }

        // Method 3: Check options.ELEMENT_ID
        if (!entityId && placementInfo?.options?.ELEMENT_ID) {
          entityId = String(placementInfo.options.ELEMENT_ID);
          console.log("✅ Found entityId in options.ELEMENT_ID:", entityId);
        }

        // Method 4: Check options.ENTITY_ID
        if (!entityId && placementInfo?.options?.ENTITY_ID) {
          entityId = String(placementInfo.options.ENTITY_ID);
          console.log("✅ Found entityId in options.ENTITY_ID:", entityId);
        }

        // Method 5: Check lowercase variants
        if (!entityId && placementInfo?.options?.id) {
          entityId = String(placementInfo.options.id);
          console.log("✅ Found entityId in options.id:", entityId);
        }

        // Method 6: Check root level fields
        if (!entityId && placementInfo?.entityId) {
          entityId = String(placementInfo.entityId);
          console.log("✅ Found entityId in placementInfo.entityId:", entityId);
        }

        // Method 7: Check DEAL_ID for compatibility
        if (!entityId && placementInfo?.options?.DEAL_ID) {
          entityId = String(placementInfo.options.DEAL_ID);
          console.log("✅ Found entityId in options.DEAL_ID:", entityId);
        }

        // Entity Type ID checks
        if (placementInfo?.options?.ENTITY_TYPE_ID) {
          entityTypeId = String(placementInfo.options.ENTITY_TYPE_ID);
          console.log("✅ Found entityTypeId in options.ENTITY_TYPE_ID:", entityTypeId);
        }
        if (!entityTypeId && placementInfo?.entityTypeId) {
          entityTypeId = String(placementInfo.entityTypeId);
          console.log("✅ Found entityTypeId in placementInfo.entityTypeId:", entityTypeId);
        }

        console.log("📊 Final values - entityId:", entityId, "entityTypeId:", entityTypeId);

        // If no entityId found, provide detailed error message with instructions
        let errorMessage = null;
        let useDemoMode = false;

        if (!entityId) {
          console.warn("⚠️ Entity ID не найден! Проверьте консоль для диагностики.");
          console.warn("💡 Доступные поля в placement.info():", Object.keys(placementInfo || {}).join(", "));
          console.warn("💡 Доступные поля в options:", Object.keys(placementInfo?.options || {}).join(", "));
          
          errorMessage = `ID элемента не найден.
          
Возможные причины:
1. Приложение открыто НЕ из карточки Smart Process "Событие"
2. Неправильно настроен placement в Bitrix24
3. Отсутствуют необходимые права доступа

Инструкции:
✓ Откройте приложение из карточки Smart Process
✓ Убедитесь, что placement настроен как "CRM_DYNAMIC_*_DETAIL_TAB"
✓ Проверьте консоль браузера для детальной диагностики

Временно работаю в DEMO-режиме с тестовыми данными.`;
          
          // Fallback to demo mode
          useDemoMode = true;
          entityId = "demo-entity-" + Date.now();
          entityTypeId = "demo-type-smart-process";
          console.log("🎭 Включен DEMO-режим. EntityId:", entityId);
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
