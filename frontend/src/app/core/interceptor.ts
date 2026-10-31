import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject, Injectable, signal, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { catchError, finalize, throwError } from "rxjs";
import { ToastrService } from "ngx-toastr";
import { API_BASE } from "./api.service";
import { AuthService } from "./auth.service";
import { Problem } from "./models";
@Injectable({ providedIn: "root" })
export class Loading {
  count = signal(0);
}
export function message(error: unknown): string {
  if (!(error instanceof HttpErrorResponse))
    return "The request could not be completed. Please try again.";
  if (error.status === 0)
    return "We could not connect. Please try again shortly.";
  if (error.status === 403)
    return "Your account does not have permission for this action.";
  if (error.status === 429) return "Please wait a moment before trying again.";
  const p = error.error as Problem;
  return p?.errors
    ? Object.values(p.errors).flat().join(" ")
    : p?.detail || "The request could not be completed. Please try again.";
}
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE);
  if (!req.url.startsWith(base + "/")) return next(req);
  const loading = inject(Loading),
    auth = inject(AuthService),
    toasts = inject(ToastrService),
    browser = isPlatformBrowser(inject(PLATFORM_ID));
  const staff =
    req.url.startsWith(base + "/admin/") ||
    req.url.endsWith("/auth/logout") ||
    req.url.endsWith("/auth/me");
  if (staff && auth.token())
    req = req.clone({
      setHeaders: { Authorization: "Bearer " + auth.token() },
    });
  loading.count.update((n) => n + 1);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (staff && error.status === 401 && browser) auth.expire();
      if (staff && browser) toasts.error(message(error));
      return throwError(() => error);
    }),
    finalize(() => loading.count.update((n) => Math.max(0, n - 1))),
  );
};
