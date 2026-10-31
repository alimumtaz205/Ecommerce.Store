import { Component, DestroyRef, inject, signal } from "@angular/core";
import { Router, ActivatedRoute, RouterLink } from "@angular/router";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  catchError,
  of,
  debounceTime,
  distinctUntilChanged,
  finalize,
  switchMap,
  tap,
} from "rxjs";
import { ApiService } from "../core/api.service";
import { SeoService } from "../core/seo.service";
import { Product, Category } from "../core/models";
import { ProductCardComponent } from "../shared/product-card.component";
import { UI } from "../shared/ui";
@Component({
  selector: "app-shop",
  imports: [RouterLink, ReactiveFormsModule, ProductCardComponent, ...UI],
  template: `<div class="wrap page">
    <div class="breadcrumbs"><a routerLink="/">Home</a><span>/</span>Shop</div>
    <header class="page-title">
      <span class="overline">THE COLLECTION</span>
      <h1>Find your everyday favourites.</h1>
      <p>Explore published products, pack sizes, and current availability.</p>
    </header>
    <div class="shop-toolbar">
      <mat-form-field appearance="outline"
        ><mat-label>Search products</mat-label
        ><mat-icon matPrefix>search</mat-icon
        ><input
          matInput
          [formControl]="search"
          maxlength="150" /></mat-form-field
      ><mat-form-field appearance="outline"
        ><mat-label>Category</mat-label
        ><mat-select
          [value]="category()"
          (selectionChange)="setCategory($event.value)"
          ><mat-option value="">All categories</mat-option>
          @for (c of categories(); track c.id) {
            <mat-option [value]="'' + c.id">{{ c.name }}</mat-option>
          }
        </mat-select></mat-form-field
      ><mat-form-field appearance="outline"
        ><mat-label>Sort by</mat-label
        ><mat-select [value]="sort()" (selectionChange)="setSort($event.value)"
          ><mat-option value="newest">Newest</mat-option
          ><mat-option value="name">Name</mat-option
          ><mat-option value="price-asc">Price: low to high</mat-option
          ><mat-option value="price-desc"
            >Price: high to low</mat-option
          ></mat-select
        ></mat-form-field
      >
    </div>
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="30" />Loading products…</div>
    } @else if (error()) {
      <div class="notice" role="alert">
        We could not load the collection.<button mat-button (click)="reload()">
          Try again
        </button>
      </div>
    } @else if (products().length) {
      <div class="product-grid">
        @for (product of products(); track product.id) {
          <app-product-card [product]="product" />
        }
      </div>
    } @else {
      <div class="empty">
        <mat-icon>search_off</mat-icon>
        <h2>No products to show.</h2>
        <p>Try another category or search, or contact us about availability.</p>
        <a mat-stroked-button routerLink="/contact">Contact Nutragea</a>
      </div>
    }
    <div class="pagination">
      <button
        mat-stroked-button
        [disabled]="page() === 1 || loading()"
        (click)="go(page() - 1)"
      >
        <mat-icon>arrow_back</mat-icon>Previous</button
      ><span>Page {{ page() }}</span
      ><button
        mat-stroked-button
        [disabled]="!more() || loading()"
        (click)="go(page() + 1)"
      >
        Next<mat-icon iconPositionEnd>arrow_forward</mat-icon>
      </button>
    </div>
  </div>`,
})
export class ShopComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy = inject(DestroyRef);
  search = new FormControl("", { nonNullable: true });
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  category = signal("");
  sort = signal("newest");
  page = signal(1);
  more = signal(false);
  loading = signal(false);
  error = signal(false);
  constructor() {
    inject(SeoService).set(
      "Shop regional products",
      "Browse Nutragea products, pack sizes, prices, and availability.",
      "/shop",
    );
    this.api
      .categories()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (c) => this.categories.set(c), error: () => {} });
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((search) =>
        this.navigate({ search: search || null, page: 1 }),
      );
    this.route.queryParamMap
      .pipe(
        tap((p) => {
          this.category.set(p.get("category") || "");
          this.sort.set(p.get("sort") || "newest");
          this.page.set(
            Math.max(1, Math.min(100000, Number(p.get("page")) || 1)),
          );
          this.search.setValue(p.get("search") || "", { emitEvent: false });
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap(() =>
          this.api
            .products({
              page: this.page(),
              pageSize: 12,
              search: this.search.value,
              sort: this.sort(),
              ...(this.category() ? { category: this.category() } : {}),
            })
            .pipe(
              catchError(() => {
                this.error.set(true);
                this.loading.set(false);
                return of(null);
              }),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (p) => {
          if (!p) return;
          this.products.set(p.items);
          this.more.set(p.hasMore);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
  navigate(params: Record<string, unknown>) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: "merge",
    });
  }
  go(page: number) {
    this.navigate({ page });
  }
  setCategory(category: string) {
    this.navigate({ category: category || null, page: 1 });
  }
  setSort(sort: string) {
    this.navigate({ sort, page: 1 });
  }
  reload() {
    this.navigate({ retry: Date.now() });
  }
}
