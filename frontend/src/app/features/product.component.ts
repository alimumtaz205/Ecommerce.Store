import { Component, inject, signal, computed } from "@angular/core";
import { RouterLink, ActivatedRoute } from "@angular/router";
import { ReactiveFormsModule, FormControl, Validators } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { switchMap, tap, finalize } from "rxjs";
import { ToastrService } from "ngx-toastr";
import { ApiService } from "../core/api.service";
import { CartService } from "../core/cart.service";
import { SeoService } from "../core/seo.service";
import { ProductDetail } from "../core/models";
import { environment } from "../../environments/environment";
import { MoneyPipe } from "../shared/money.pipe";
import { UI } from "../shared/ui";
@Component({
  selector: "app-product",
  imports: [RouterLink, ReactiveFormsModule, MoneyPipe, ...UI],
  template: `<div class="wrap page">
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="30" />Loading product…</div>
    } @else if (error()) {
      <div class="empty">
        <mat-icon>search_off</mat-icon>
        <h1>This product is unavailable.</h1>
        <p>It may be unpublished or temporarily unavailable.</p>
        <a mat-stroked-button routerLink="/shop">Back to shop</a>
      </div>
    } @else if (data()) {
      <div class="breadcrumbs">
        <a routerLink="/">Home</a><span>/</span><a routerLink="/shop">Shop</a
        ><span>/</span>{{ data()!.product.name }}
      </div>
      <div class="product-detail">
        <div>
          <div class="detail-photo">
            @if (data()!.product.images[image()]) {
              <img
                [src]="data()!.product.images[image()].url"
                [alt]="data()!.product.images[image()].alt"
                width="720"
                height="720"
                fetchpriority="high"
              />
            }
          </div>
          @if (data()!.product.images.length > 1) {
            <div class="thumbnails">
              @for (
                img of data()!.product.images;
                track img.id;
                let i = $index
              ) {
                <button
                  (click)="image.set(i)"
                  [class.selected]="image() === i"
                  [attr.aria-label]="'View ' + img.alt"
                >
                  <img
                    [src]="img.url"
                    [alt]="img.alt"
                    width="80"
                    height="80"
                    loading="lazy"
                  />
                </button>
              }
            </div>
          }
        </div>
        <div class="product-information">
          <span class="overline"
            >{{ data()!.product.category_name }} ·
            {{ data()!.product.origin }}</span
          >
          <h1>{{ data()!.product.name }}</h1>
          <p class="intro">{{ data()!.product.summary }}</p>
          <div class="price">{{ selected()?.price | money }}</div>
          <mat-form-field appearance="outline"
            ><mat-label>Pack size</mat-label
            ><mat-select
              [value]="variant()"
              (selectionChange)="variant.set($event.value)"
            >
              @for (v of data()!.variants; track v.id) {
                <mat-option [value]="v.id"
                  >{{ v.label }} · {{ v.price | money }}</mat-option
                >
              }
            </mat-select></mat-form-field
          >
          <p class="availability" [class.unavailable]="!selected()?.available">
            <span></span
            >{{
              selected()?.available
                ? selected()!.available + " packs currently available"
                : "Currently unavailable"
            }}
          </p>
          <div class="add-row">
            <mat-form-field appearance="outline"
              ><mat-label>Quantity</mat-label
              ><input
                matInput
                type="number"
                min="1"
                max="100"
                step="1"
                [formControl]="quantity" /></mat-form-field
            ><button
              mat-flat-button
              (click)="add()"
              [disabled]="!selected()?.available || quantity.invalid"
            >
              <mat-icon>shopping_bag</mat-icon>Add to bag
            </button>
          </div>
          <p class="muted small">
            Availability is checked again at checkout. Adding to your bag does
            not reserve stock.
          </p>
          <a class="quiet-link" routerLink="/wholesale"
            >Looking for larger quantities?<mat-icon>north_east</mat-icon></a
          >
        </div>
      </div>
      <section class="product-facts">
        <div>
          <h2>About this product</h2>
          <p class="pre-line">{{ data()!.product.description }}</p>
        </div>
        <div>
          <h3>Ingredients</h3>
          <p class="pre-line">{{ data()!.product.ingredients }}</p>
          <h3>Allergens</h3>
          <p class="pre-line">{{ data()!.product.allergens }}</p>
          <h3>Storage</h3>
          <p class="pre-line">{{ data()!.product.storage }}</p>
        </div>
      </section>
      <div class="notice">
        Delivery eligibility, charges, and current policies are shown during
        checkout. For international sourcing, please use our wholesale enquiry
        form.
      </div>
    }
  </div>`,
})
export class ProductComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private cart = inject(CartService);
  private toast = inject(ToastrService);
  private seo = inject(SeoService);
  data = signal<ProductDetail | null>(null);
  image = signal(0);
  variant = signal(0);
  selected = computed(() =>
    this.data()?.variants.find((v) => v.id === this.variant()),
  );
  quantity = new FormControl(1, {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.min(1),
      Validators.max(100),
      Validators.pattern(/^\d+$/),
    ],
  });
  loading = signal(true);
  error = signal(false);
  constructor() {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap((p) => this.api.product(p.get("slug") || "")),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.variant.set(
            d.variants.find((v) => v.available > 0)?.id ||
              d.variants[0]?.id ||
              0,
          );
          this.image.set(0);
          this.loading.set(false);
          this.seo.set(
            d.product.name,
            d.product.summary,
            "/shop/" + d.product.slug,
            d.product.images[0]?.url,
          );
          if (d.variants.length)
            this.seo.structured({
              "@context": "https://schema.org",
              "@type": "Product",
              name: d.product.name,
              description: d.product.summary,
              image: d.product.images.map(
                (i) => new URL(i.url, environment.siteUrl).href,
              ),
              brand: { "@type": "Brand", name: "Nutragea" },
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "PKR",
                lowPrice: Math.min(...d.variants.map((v) => v.price)),
                highPrice: Math.max(...d.variants.map((v) => v.price)),
                offerCount: d.variants.length,
                availability: d.variants.some((v) => v.available > 0)
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                url: new URL("/shop/" + d.product.slug, environment.siteUrl)
                  .href,
              },
            });
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
  add() {
    const v = this.selected();
    const already =
      this.cart.lines().find((l) => l.variantId === v?.id)?.quantity || 0;
    if (
      !v ||
      this.quantity.invalid ||
      already + this.quantity.value > v.available ||
      already + this.quantity.value > 100
    ) {
      this.toast.warning(
        "Choose a quantity within current availability and the 100-pack limit.",
      );
      return;
    }
    this.cart.add(v.id, this.quantity.value);
    this.toast.success("Added to your bag.");
  }
}
