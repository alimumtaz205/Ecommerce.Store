import { HttpClient } from "@angular/common/http";
import { inject, Injectable, InjectionToken } from "@angular/core";
import { Observable, expand, EMPTY, reduce } from "rxjs";
import { environment } from "../../environments/environment";
import {
  Category,
  Content,
  Product,
  ProductDetail,
  Page,
  Settings,
  Row,
  CartLine,
  CartView,
  Quote,
  OrderResult,
  OrderView,
} from "./models";
export const API_BASE = new InjectionToken<string>("API_BASE", {
  factory: () => environment.api,
});
@Injectable({ providedIn: "root" })
export class ApiService {
  readonly base = inject(API_BASE);
  private http = inject(HttpClient);
  settings() {
    return this.http.get<Settings>(this.base + "/settings");
  }
  categories() {
    return this.http.get<Category[]>(this.base + "/categories");
  }
  products(params: Record<string, string | number> = {}) {
    return this.http.get<Page<Product>>(this.base + "/products", { params });
  }
  product(slug: string) {
    return this.http.get<ProductDetail>(
      this.base + "/products/" + encodeURIComponent(slug),
    );
  }
  content(type?: string) {
    return this.http.get<Content[]>(this.base + "/content", {
      params: type ? { type } : {},
    });
  }
  page(slug: string) {
    return this.http.get<Content>(
      this.base + "/content/" + encodeURIComponent(slug),
    );
  }
  inspectCart(items: CartLine[]) {
    return this.http.post<CartView[]>(this.base + "/cart", { items });
  }
  quote(items: CartLine[], shippingId: number) {
    return this.http.post<Quote>(this.base + "/quote", { items, shippingId });
  }
  place(body: Record<string, unknown>) {
    return this.http.post<OrderResult>(this.base + "/orders", body);
  }
  lookup(reference: string, accessCode: string) {
    return this.http.post<OrderView>(this.base + "/orders/lookup", {
      reference,
      accessCode,
    });
  }
  enquiry(body: Record<string, unknown>) {
    return this.http.post<{ message: string }>(this.base + "/enquiries", body);
  }
  admin(kind: string, page = 1) {
    return this.http.get<Page<Row>>(this.base + "/admin/" + kind, {
      params: { page },
    });
  }
  adminAll(kind: string): Observable<Row[]> {
    return this.admin(kind).pipe(
      expand(
        (p) =>
          p.hasMore && p.page < 50 ? this.admin(kind, p.page + 1) : EMPTY,
        1,
      ),
      reduce((all: Row[], p) => all.concat(p.items), []),
    );
  }
  adminSettings() {
    return this.http.get<Row>(this.base + "/admin/settings");
  }
  adminOrder(id: number) {
    return this.http.get<OrderView>(this.base + "/admin/orders/" + id);
  }
  save(
    path: string,
    body: Record<string, unknown>,
    method: "POST" | "PUT" = "POST",
  ) {
    return this.http.request<Row>(method, this.base + "/admin/" + path, {
      body,
    });
  }
  upload(body: FormData) {
    return this.http.post<Row>(this.base + "/admin/media", body);
  }
  mediaPreview(id: number) {
    return this.http.get(this.base + "/admin/media/" + id + "/preview", {
      responseType: "blob",
    });
  }
}
