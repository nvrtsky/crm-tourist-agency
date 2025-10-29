import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Log ALL incoming requests for debugging
app.use((req, _res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Auto-rebind endpoint - MUST be registered before Vite middleware
  // This fixes placement HANDLER to point to '/' instead of '/install'
  app.get("/install", (req: Request, res: Response) => {
    console.log("🔧 [AUTO-REBIND] GET /install triggered!");
    console.log("  - URL:", req.url);
    console.log("  - Path:", req.path);
    console.log("  - Query:", req.query);
    console.log("  - Headers User-Agent:", req.headers['user-agent']);
    console.log("  - Headers Referer:", req.headers['referer']);
    
    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Исправление Placement</title>
  <script src="//api.bitrix24.com/api/v1/"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .card {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    .status {
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
      font-size: 14px;
    }
    .status.info {
      background: #e3f2fd;
      color: #1565c0;
      border-left: 4px solid #1976d2;
    }
    .status.success {
      background: #e8f5e9;
      color: #2e7d32;
      border-left: 4px solid #4caf50;
    }
    .status.error {
      background: #ffebee;
      color: #c62828;
      border-left: 4px solid #f44336;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #1976d2;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    button {
      background: #1976d2;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 15px;
    }
    button:hover {
      background: #1565c0;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔧 Автоматическое исправление Placement</h1>
    <div id="status"></div>
  </div>

  <script>
    const statusEl = document.getElementById('status');
    
    function showStatus(message, type = 'info', spinner = false) {
      statusEl.innerHTML = \`
        <div class="status \${type}">
          \${spinner ? '<div class="spinner"></div>' : ''}
          <div style="margin-top: 10px;">\${message}</div>
        </div>
      \`;
    }

    async function autoRebind() {
      try {
        showStatus('⏳ Инициализация Bitrix24 SDK...', 'info', true);
        
        // Initialize BX24
        await new Promise((resolve, reject) => {
          if (!window.BX24) {
            reject(new Error('BX24 SDK не загружен. Откройте эту страницу из Bitrix24.'));
            return;
          }
          
          BX24.init(() => {
            console.log('✅ BX24.init() завершен');
            resolve();
          });
        });

        showStatus('🔍 Получение информации о текущем placement...', 'info', true);
        
        const placementInfo = BX24.placement.info();
        console.log('Placement info:', placementInfo);
        
        const PLACEMENT_CODE = 'CRM_DYNAMIC_176_DETAIL_TAB';
        
        showStatus('🗑️ Удаление старого placement...', 'info', true);
        
        // Unbind old placement
        await new Promise((resolve, reject) => {
          BX24.callMethod('placement.unbind', {
            PLACEMENT: PLACEMENT_CODE
          }, (result) => {
            if (result.error()) {
              console.error('Ошибка unbind:', result.error());
              // Continue anyway - maybe it wasn't bound
              resolve();
            } else {
              console.log('✅ Placement unbind успешно:', result.data());
              resolve();
            }
          });
        });

        showStatus('✨ Регистрация нового placement с правильным URL...', 'info', true);
        
        // Bind new placement with correct HANDLER
        await new Promise((resolve, reject) => {
          BX24.callMethod('placement.bind', {
            PLACEMENT: PLACEMENT_CODE,
            HANDLER: window.location.origin + '/',
            TITLE: 'Управление группой',
            DESCRIPTION: 'Управление групповыми турами по Китаю'
          }, (result) => {
            if (result.error()) {
              console.error('Ошибка bind:', result.error());
              reject(new Error('Не удалось зарегистрировать placement: ' + result.error()));
            } else {
              console.log('✅ Placement bind успешно:', result.data());
              resolve();
            }
          });
        });

        showStatus(\`
          ✅ <strong>Placement успешно исправлен!</strong><br><br>
          Теперь приложение будет загружаться с правильным URL.<br><br>
          <button onclick="window.location.reload()">🔄 Перезагрузить страницу</button>
        \`, 'success');

      } catch (error) {
        console.error('❌ Ошибка при auto-rebind:', error);
        showStatus(\`
          ❌ <strong>Ошибка:</strong><br>
          \${error.message}<br><br>
          Попробуйте:<br>
          1. Обновить страницу<br>
          2. Открыть приложение из Bitrix24<br>
          3. Проверить права доступа<br><br>
          <button onclick="window.location.reload()">🔄 Попробовать снова</button>
        \`, 'error');
      }
    }

    // Start auto-rebind on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoRebind);
    } else {
      autoRebind();
    }
  </script>
</body>
</html>
    `);
  });

  // Serve install.html as a static file before catch-all routes
  app.get("/install.html", (_req: Request, res: Response) => {
    res.sendFile("install.html", { root: "public" });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
