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
        
        // Try multiple possible field names for Smart Process
        let entityId = null;
        let entityTypeId = null;

        // Method 0: Extract from iframe URL parameters (window.location.href)
        // Bitrix24 может передавать entity ID через URL параметры iframe
        const urlParams = new URLSearchParams(window.location.search);
        
        // Попытка извлечь из различных параметров
        const possibleIdParams = ['ENTITY_ID', 'entityId', 'ID', 'id', 'ITEM_ID', 'itemId'];
        for (const param of possibleIdParams) {
          const value = urlParams.get(param);
          if (value && /^\d+$/.test(value)) {
            entityId = value;
            console.log(`✓ Найден entityId в URL параметре "${param}":`, entityId);
            break;
          }
        }

        // Method 1: Extract from parent URL (document.referrer) 
        // URL формат: https://mitclick.bitrix24.ru/sobytie/176/details/3039/?...
        if (!entityId && document.referrer) {
          console.log('🔍 Парсинг document.referrer:', document.referrer);
          
          // Извлекаем путь из URL
          try {
            const referrerUrl = new URL(document.referrer);
            const pathname = referrerUrl.pathname; // Например: /sobytie/176/details/3039/
            console.log('   Путь (pathname):', pathname);
            
            // Ищем все числа в пути
            const allNumbers = pathname.match(/\/(\d+)/g);
            console.log('   Найденные числа:', allNumbers);
            
            if (allNumbers && allNumbers.length > 0) {
              // Берём последнее число (скорее всего это ID элемента)
              const lastNumber = allNumbers[allNumbers.length - 1].replace('/', '');
              entityId = lastNumber;
              console.log('✓ Извлечён entityId из document.referrer:', entityId);
            }
          } catch (e) {
            console.warn('Не удалось распарсить document.referrer:', e);
          }
        }

        // Method 2: Check placementInfo.options (разные варианты полей)
        if (!entityId && placementInfo?.options) {
          const options = placementInfo.options;
          const possibleFields = ['ID', 'ITEM_ID', 'ELEMENT_ID', 'ENTITY_ID', 'id', 'DEAL_ID'];
          
          for (const field of possibleFields) {
            if (options[field]) {
              entityId = String(options[field]);
              console.log(`✓ Найден entityId в placementInfo.options.${field}:`, entityId);
              break;
            }
          }
        }

        // Method 3: Check root level fields
        if (!entityId && placementInfo?.entityId) {
          entityId = String(placementInfo.entityId);
          console.log('✓ Найден entityId в placementInfo.entityId:', entityId);
        }

        // Entity Type ID checks
        // Extract from placement name: "CRM_DYNAMIC_176_DETAIL_TAB" -> entityTypeId = "176"
        if (placementInfo?.placement) {
          const typeMatch = placementInfo.placement.match(/CRM_DYNAMIC_(\d+)_DETAIL_TAB/);
          if (typeMatch && typeMatch[1]) {
            entityTypeId = typeMatch[1];
            console.log('✓ Извлечён entityTypeId из placement:', entityTypeId);
          }
        }
        
        if (!entityTypeId && placementInfo?.options?.ENTITY_TYPE_ID) {
          entityTypeId = String(placementInfo.options.ENTITY_TYPE_ID);
        }
        if (!entityTypeId && placementInfo?.entityTypeId) {
          entityTypeId = String(placementInfo.entityTypeId);
        }

        // ИТОГОВАЯ ДИАГНОСТИКА
        console.log('📋 РЕЗУЛЬТАТ ИЗВЛЕЧЕНИЯ:', {
          entityId: entityId || '❌ НЕ НАЙДЕН',
          entityTypeId: entityTypeId || '❌ НЕ НАЙДЕН',
          placement: placementInfo?.placement,
          options: placementInfo?.options,
          referrer: document.referrer,
          iframeUrl: window.location.href
        });

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
