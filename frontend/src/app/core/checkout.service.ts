import { inject, Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import { tap, shareReplay } from "rxjs";
import { ApiService } from "./api.service";
import { CartService } from "./cart.service";
import { OrderResult } from "./models";
@Injectable({ providedIn: "root" })
export class CheckoutService {
  private api = inject(ApiService);
  private cart = inject(CartService);
  private router = inject(Router);
  latest = signal<OrderResult | null>(null);
  requestId: string | null = null;
  place(body: Record<string, unknown>) {
    if (!this.requestId) this.requestId = crypto.randomUUID();
    return this.api.place({ ...body, requestId: this.requestId }).pipe(
      tap((order) => {
        this.latest.set(order);
        this.cart.clear();
        this.requestId = null;
        void this.router.navigate(["/order-confirmation"]);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }
}
