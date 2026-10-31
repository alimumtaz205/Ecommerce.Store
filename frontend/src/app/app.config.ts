import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from "@angular/common/http";
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from "@angular/platform-browser";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideToastr } from "ngx-toastr";
import { routes } from "./app.routes";
import { apiInterceptor } from "./core/interceptor";
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: "enabled" }),
    ),
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor])),
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
        filter: (req) =>
          req.method === "GET" &&
          !req.url.includes("/admin/") &&
          !req.url.includes("/auth/"),
      }),
    ),
    provideAnimationsAsync(),
    provideToastr({
      positionClass: "toast-bottom-right",
      closeButton: true,
      preventDuplicates: true,
      enableHtml: false,
      timeOut: 5000,
    }),
  ],
};
