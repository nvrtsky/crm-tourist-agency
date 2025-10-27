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
    };
  }
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

    if (!window.BX24) {
      setContext((prev) => ({
        ...prev,
        error: "Bitrix24 SDK не загружен",
        isReady: true,
      }));
      return;
    }

    window.BX24.init(() => {
      try {
        const placementInfo = window.BX24!.placement.info();
        const auth = window.BX24!.getAuth();
        const domain = auth.domain || window.BX24!.getDomain();

        // Debug: Log full placement info structure
        console.log("🔍 Bitrix24 Placement Info (полная структура):", JSON.stringify(placementInfo, null, 2));
        console.log("🔍 Bitrix24 Auth Info:", JSON.stringify(auth, null, 2));
        
        // Try multiple possible field names for Smart Process
        let entityId = null;
        let entityTypeId = null;

        // Method 1: Check options.ID and options.ENTITY_TYPE_ID
        if (placementInfo?.options?.ID) {
          entityId = String(placementInfo.options.ID);
          console.log("✅ Found entityId in options.ID:", entityId);
        }
        if (placementInfo?.options?.ENTITY_TYPE_ID) {
          entityTypeId = String(placementInfo.options.ENTITY_TYPE_ID);
          console.log("✅ Found entityTypeId in options.ENTITY_TYPE_ID:", entityTypeId);
        }

        // Method 2: Check for ENTITY_ID (alternative naming)
        if (!entityId && placementInfo?.options?.ENTITY_ID) {
          entityId = String(placementInfo.options.ENTITY_ID);
          console.log("✅ Found entityId in options.ENTITY_ID:", entityId);
        }

        // Method 3: Check root level fields
        if (!entityId && placementInfo?.entityId) {
          entityId = String(placementInfo.entityId);
          console.log("✅ Found entityId in root level:", entityId);
        }
        if (!entityTypeId && placementInfo?.entityTypeId) {
          entityTypeId = String(placementInfo.entityTypeId);
          console.log("✅ Found entityTypeId in root level:", entityTypeId);
        }

        // Method 4: Check for placement-specific fields
        if (!entityId && placementInfo?.placement) {
          console.log("🔍 Checking placement object:", placementInfo.placement);
        }

        console.log("📊 Final values - entityId:", entityId, "entityTypeId:", entityTypeId);

        const errorMessage = !entityId && !entityTypeId 
          ? "Не удалось получить ID элемента Smart Process. Убедитесь, что приложение открыто из карточки Smart Process 'Событие'"
          : !entityId 
            ? "Не найден ID элемента (Deal ID)"
            : !entityTypeId
              ? "Не найден тип сущности (Entity Type ID)"
              : null;

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
