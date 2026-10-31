import { ApplicationConfig, mergeApplicationConfig } from "@angular/core";
import {
  provideServerRendering,
  withRoutes,
  RenderMode,
  ServerRoute,
} from "@angular/ssr";
import { HTTP_TRANSFER_CACHE_ORIGIN_MAP } from "@angular/common/http";
import { environment } from "../environments/environment";
import { appConfig } from "./app.config";
import { API_BASE } from "./core/api.service";
const serverRoutes: ServerRoute[] = [
  { path: "staff/**", renderMode: RenderMode.Client },
  { path: "cart", renderMode: RenderMode.Client },
  { path: "checkout", renderMode: RenderMode.Client },
  { path: "order-confirmation", renderMode: RenderMode.Client },
  { path: "track", renderMode: RenderMode.Client },
  { path: "**", renderMode: RenderMode.Server },
];
const config: ApplicationConfig = {
  providers: [
    {
      provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP,
      useFactory: () => ({
        [(
          globalThis as unknown as {
            process: { env: Record<string, string | undefined> };
          }
        ).process?.env["SSR_API_ORIGIN"] || "https://localhost:7280"]:
          environment.siteUrl,
      }),
    },
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: API_BASE,
      useFactory: () =>
        ((
          globalThis as unknown as {
            process: { env: Record<string, string | undefined> };
          }
        ).process?.env["SSR_API_ORIGIN"] || "https://localhost:7280") + "/capi",
    },
  ],
};
export const serverConfig = mergeApplicationConfig(appConfig, config);
