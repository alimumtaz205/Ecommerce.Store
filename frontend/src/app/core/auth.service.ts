import { inject, Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { tap, finalize } from "rxjs";
import { API_BASE } from "./api.service";
import { Login, Staff } from "./models";
@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  private base = inject(API_BASE);
  private router = inject(Router);
  private dialogs = inject(MatDialog);
  token = signal<string | null>(null);
  user = signal<Staff | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  login(username: string, password: string) {
    debugger
    return this.http
      .post<Login>(this.base + "/auth/login", {
        username: username.trim(),
        password,
      })
      .pipe(
        tap((r) => {
          if (
            !r?.accessToken ||
            !r.user ||
            !Number.isFinite(Date.parse(r.expiresAt))
          )
            throw new Error("Invalid sign-in response.");
          this.clear();
          this.token.set(r.accessToken);
          this.user.set(r.user);
          this.timer = setTimeout(
            () => this.expire(),
            Math.max(0, Date.parse(r.expiresAt) - Date.now()),
          );
        }),
      );
  }
  logout() {
    return this.http
      .post(this.base + "/auth/logout", {})
      .pipe(finalize(() => this.expire()));
  }
  private clear() {
    if (this.timer) clearTimeout(this.timer);
    this.token.set(null);
    this.user.set(null);
  }
  expire() {
    this.clear();
    this.dialogs.closeAll();
    void this.router.navigate(["/staff/login"]);
  }
}
