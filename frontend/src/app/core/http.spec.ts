import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  provideHttpClient,
  withInterceptors,
  HttpClient,
  HttpErrorResponse,
} from "@angular/common/http";
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing";
import { PLATFORM_ID, signal } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { apiInterceptor, Loading, message } from "./interceptor";
import { AuthService } from "./auth.service";
import { API_BASE } from "./api.service";
describe("authentication and HTTP boundary", () => {
  let http: HttpClient;
  let mock: HttpTestingController;
  const expire = vi.fn();
  beforeEach(() => {
    expire.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: "browser" },
        { provide: API_BASE, useValue: "/capi" },
        {
          provide: AuthService,
          useValue: { token: signal("private-jwe"), expire },
        },
        { provide: ToastrService, useValue: { error: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => mock.verify());
  it("attaches JWE only to staff API operations", () => {
    for (const [url, expected] of [
      ["/capi/admin/orders", "Bearer private-jwe"],
      ["/capi/products", null],
      ["https://elsewhere.invalid/capi/admin/orders", null],
    ] as [string, string | null][]) {
      http.get(url).subscribe();
      const r = mock.expectOne(url);
      expect(r.request.headers.get("Authorization")).toBe(expected);
      r.flush({});
    }
    expect(TestBed.inject(Loading).count()).toBe(0);
  });
  it("expires a rejected staff session and balances loading", () => {
    http.get("/capi/admin/orders").subscribe({ error: () => {} });
    mock
      .expectOne("/capi/admin/orders")
      .flush({}, { status: 401, statusText: "Unauthorized" });
    expect(expire).toHaveBeenCalledOnce();
    expect(TestBed.inject(Loading).count()).toBe(0);
  });
  it("renders server validation and connection errors without throwing", () => {
    expect(
      message(
        new HttpErrorResponse({
          status: 400,
          error: { errors: { Name: ["Enter your name."] } },
        }),
      ),
    ).toContain("Enter your name.");
    expect(message(new HttpErrorResponse({ status: 0 }))).toContain("connect");
  });
});
