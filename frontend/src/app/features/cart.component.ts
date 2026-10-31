import { Component, DestroyRef, inject, signal, computed } from "@angular/core";
import { RouterLink } from "@angular/router";
import { toObservable, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { of, switchMap, debounceTime, catchError, tap } from "rxjs";
import { ApiService } from "../core/api.service";
import { CartService } from "../core/cart.service";
import { CartView } from "../core/models";
import { MoneyPipe } from "../shared/money.pipe";
import { UI } from "../shared/ui";
@Component({
  selector: "app-cart",
  imports: [RouterLink, MoneyPipe, ...UI],
  template: `<div class="wrap page">
    <div class="breadcrumbs">
      <a routerLink="/shop">Shop</a><span>/</span>Your bag
    </div>
    <header class="page-title">
      <span class="overline">YOUR SELECTION</span>
      <h1>A little closer to yours.</h1>
      <p>Review pack sizes and quantities before checkout.</p>
    </header>
    @if (cart.storageNotice()) {
      <div class="notice">{{ cart.storageNotice() }}</div>
    }
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="28" />Updating your bag…</div>
    } @else if (error()) {
      <div class="notice" role="alert">
        We could not update your bag.
        <button mat-button (click)="retry()">Try again</button>
      </div>
    } @else if (!cart.lines().length) {
      <div class="empty">
        <mat-icon>shopping_bag</mat-icon>
        <h2>Your bag is waiting.</h2>
        <p>Explore our collection and add something you like.</p>
        <a mat-flat-button routerLink="/shop">Explore the shop</a>
      </div>
    } @else {
      <div class="cart-layout">
        <section class="cart-items">
          @for (item of rows(); track item.variantId) {
            <article class="cart-item">
              @if (item.image) {
                <img
                  [src]="item.image.url"
                  [alt]="item.image.alt"
                  width="110"
                  height="110"
                />
              }
              <div>
                <h3>
                  @if (item.slug) {
                    <a [routerLink]="['/shop', item.slug]">{{
                      item.product
                    }}</a>
                  } @else {
                    Product unavailable
                  }
                </h3>
                <p class="muted">{{ item.label }}</p>
                <strong>{{ item.price | money }}</strong>
                @if (!item.available || item.quantity > item.available) {
                  <p class="field-error">
                    This quantity is not currently available.
                  </p>
                }
                <div class="quantity-controls">
                  <button
                    mat-icon-button
                    [attr.aria-label]="'Reduce ' + item.product + ' quantity'"
                    (click)="cart.set(item.variantId, item.quantity - 1)"
                  >
                    <mat-icon>remove</mat-icon></button
                  ><span>{{ item.quantity }}</span
                  ><button
                    mat-icon-button
                    [attr.aria-label]="'Increase ' + item.product + ' quantity'"
                    [disabled]="
                      item.quantity >= item.available || item.quantity >= 100
                    "
                    (click)="cart.set(item.variantId, item.quantity + 1)"
                  >
                    <mat-icon>add</mat-icon></button
                  ><button mat-button (click)="cart.set(item.variantId, 0)">
                    Remove
                  </button>
                </div>
              </div>
              <strong>{{
                (item.price === null ? null : item.quantity * item.price)
                  | money
              }}</strong>
            </article>
          }
          <div class="button-row">
            <a class="quiet-link" routerLink="/shop"
              ><mat-icon>arrow_back</mat-icon>Continue shopping</a
            ><button mat-button (click)="cart.clear()">Clear bag</button>
          </div>
        </section>
        <aside class="panel order-summary">
          <span class="overline">ORDER SUMMARY</span>
          <h2>Your bag</h2>
          <div class="summary-line">
            <span>Product subtotal</span
            ><strong>{{ subtotal() | money }}</strong>
          </div>
          <p class="small muted">
            Delivery charges and the final total are calculated on the server at
            checkout.
          </p>
          <a mat-flat-button routerLink="/checkout" [disabled]="invalid()"
            >Continue to checkout<mat-icon iconPositionEnd
              >arrow_forward</mat-icon
            ></a
          >
          <p class="small muted">
            Stock is not reserved until an order is successfully placed.
          </p>
        </aside>
      </div>
    }
  </div>`,
})
export class CartComponent {
  readonly cart = inject(CartService);
  private api = inject(ApiService);
  rows = signal<CartView[]>([]);
  loading = signal(false);
  error = signal(false);
  private trigger = signal(0);
  subtotal = computed(() =>
    this.rows().reduce((n, r) => n + (r.price || 0) * r.quantity, 0),
  );
  invalid = computed(
    () =>
      !this.rows().length || this.rows().some((r) => r.quantity > r.available),
  );
  constructor() {
    toObservable(
      computed(() => ({ lines: this.cart.lines(), retry: this.trigger() })),
    )
      .pipe(
        debounceTime(150),
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap(({ lines }) =>
          lines.length
            ? this.api.inspectCart(lines).pipe(
                catchError(() => {
                  this.error.set(true);
                  return of([]);
                }),
              )
            : of([]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      });
  }
  retry() {
    this.trigger.update((n) => n + 1);
  }
}
