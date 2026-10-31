import { Meta } from "@angular/platform-browser";
import { SeoService } from "./core/seo.service";
import { Component, DestroyRef, inject, signal } from "@angular/core";
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  NavigationEnd,
} from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter } from "rxjs";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { CartService } from "./core/cart.service";
import { ApiService } from "./core/api.service";
import { Loading } from "./core/interceptor";
import { Settings } from "./core/models";
import { UI } from "./shared/ui";
@Component({
  selector: "app-root",
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatProgressBarModule,
    ...UI,
  ],
  template: `
    @if (loading.count() > 0) {
      <mat-progress-bar
        class="global-loader"
        mode="indeterminate"
        aria-label="Loading"
      />
    }
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="announcement">
      Rooted in Gilgit-Baltistan. Connected to a wider world.
    </div>
    <header class="site-header">
      <a class="logo-link" routerLink="/" aria-label="Nutragea home"
        ><img
          src="assets/nutragea-logo-original.png"
          alt="Nutragea Dry Fruits"
          width="184"
          height="94"
      /></a>
      <nav class="desktop-nav" aria-label="Main navigation">
        @for (item of navigation; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.path === '/' }"
            >{{ item.label }}</a
          >
        }
      </nav>
      <div class="header-actions">
        <a class="cart-link" routerLink="/cart" aria-label="Open shopping bag"
          ><mat-icon>shopping_bag</mat-icon
          ><span class="cart-count">{{ cart.count() }}</span></a
        ><button
          mat-icon-button
          class="mobile-menu-button"
          (click)="menu.set(!menu())"
          [attr.aria-expanded]="menu()"
          aria-controls="mobile-nav"
          aria-label="Toggle navigation"
        >
          <mat-icon>{{ menu() ? "close" : "menu" }}</mat-icon>
        </button>
      </div>
    </header>
    @if (menu()) {
      <nav id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation">
        @for (item of navigation; track item.path) {
          <a [routerLink]="item.path" (click)="menu.set(false)"
            >{{ item.label }}<mat-icon>arrow_forward</mat-icon></a
          >
        }
      </nav>
    }
    <main id="main" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer">
      <div class="footer-top">
        <div class="footer-brand">
          <a class="logo-link" routerLink="/"
            ><img
              src="assets/nutragea-logo-original.png"
              alt="Nutragea Dry Fruits"
              width="200"
              height="108"
          /></a>
          <p>
            Regional products. Thoughtful sourcing.<br />A shared ambition for
            stronger livelihoods.
          </p>
        </div>
        <div>
          <h3>Explore</h3>
          <a routerLink="/shop">Shop products</a
          ><a routerLink="/about">Our story</a
          ><a routerLink="/impact">Our impact</a
          ><a routerLink="/stories">Stories & events</a>
        </div>
        <div>
          <h3>Connect</h3>
          <a routerLink="/wholesale">Wholesale & export</a
          ><a routerLink="/contact">Contact us</a
          ><a routerLink="/track">Track an order</a
          ><a routerLink="/staff/login">Staff workspace</a>
        </div>
        <div>
          <h3>Information</h3>
          @for (policy of policies(); track policy.slug) {
            <a [routerLink]="['/pages', policy.slug]">{{ policy.title }}</a>
          }
          @if (settings()?.supportEmail) {
            <a [href]="'mailto:' + settings()!.supportEmail">{{
              settings()!.supportEmail
            }}</a>
          }
          @if (settings()?.supportPhone) {
            <a [href]="'tel:' + settings()!.supportPhone">{{
              settings()!.supportPhone
            }}</a>
          }
          @if (settings()?.companyAddress) {<p class="small">{{settings()!.companyAddress}}</p>}
        </div>
      </div>
      <div class="footer-bottom">
        <span>© {{ year }} Nutragea</span
        ><span>Origin. Quality. Opportunity.</span
        ><a routerLink="/wholesale"
          >Bringing local products to wider markets
          <mat-icon>north_east</mat-icon></a
        >
      </div>
    </footer>
  `,
})
export class AppComponent {
  readonly cart = inject(CartService);
  readonly loading = inject(Loading);
  private api = inject(ApiService);
  private destroy = inject(DestroyRef);
  menu = signal(false);
  settings = signal<Settings | null>(null);
  policies = signal<{ slug: string; title: string }[]>([]);
  year = new Date().getFullYear();
  navigation = [
    { path: "/", label: "Home" },
    { path: "/shop", label: "Shop" },
    { path: "/about", label: "Our story" },
    { path: "/impact", label: "Our impact" },
    { path: "/stories", label: "Journal" },
    { path: "/wholesale", label: "Wholesale" },
  ];
  constructor() {
    const meta = inject(Meta),
      seo = inject(SeoService);
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.menu.set(false);
        const url = (event as NavigationEnd).urlAfterRedirects;
        const privatePage =
          /^\/(staff|cart|checkout|track|order-confirmation)(\/|$|\?)/.test(
            url,
          );
        meta.updateTag({
          name: "robots",
          content: privatePage ? "noindex,nofollow" : "index,follow",
        });
        if (privatePage)
          seo.set(
            "Nutragea workspace",
            "Manage your Nutragea visit securely.",
            url.split("?")[0],
          );
      });
    this.api
      .settings()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (s) => this.settings.set(s), error: () => {} });
    this.api
      .content("Policy")
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (p) => this.policies.set(p), error: () => {} });
  }
}
