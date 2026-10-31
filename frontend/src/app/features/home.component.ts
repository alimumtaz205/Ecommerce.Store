import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { forkJoin } from "rxjs";
import { ApiService } from "../core/api.service";
import { SeoService } from "../core/seo.service";
import { Product, Category, Content } from "../core/models";
import { ProductCardComponent } from "../shared/product-card.component";
import { UI } from "../shared/ui";
@Component({
  selector: "app-home",
  imports: [RouterLink, ProductCardComponent, ...UI],
  template: `
    <section class="hero wrap">
      <div class="hero-copy">
        <span class="overline">GILGIT-BALTISTAN, PAKISTAN</span>
        <h1>
          Good things.<br />Deep roots.<br /><em>Wider possibilities.</em>
        </h1>
        <p>
          Discover regional products and a shared ambition: better skills,
          stronger livelihoods, and a place for local goods in the wider world.
        </p>
        <div class="button-row">
          <a mat-flat-button routerLink="/shop"
            >Explore the shop<mat-icon iconPositionEnd
              >arrow_forward</mat-icon
            ></a
          ><a class="quiet-link" routerLink="/impact"
            >Discover our purpose<mat-icon>north_east</mat-icon></a
          >
        </div>
        <div class="hero-footnote">
          <span></span>Rooted in community. Looking ahead.
        </div>
      </div>
      <div class="hero-image">
        <img
          src="assets/editorial-food.png"
          alt="Editorial still life of dried fruit and nuts in ceramic bowls"
          width="1536"
          height="1024"
          fetchpriority="high"
        />
        <div class="image-label">
          <mat-icon>eco</mat-icon
          ><span>A taste of place.<small>Thoughtfully presented.</small></span>
        </div>
        <small class="editorial-caption"
          >Illustrative editorial food image</small
        >
      </div>
    </section>
    <div class="principles wrap">
      <div>
        <span>01</span>
        <p>
          <strong>A regional connection</strong>Products and stories connected
          to Gilgit-Baltistan.
        </p>
      </div>
      <div>
        <span>02</span>
        <p>
          <strong>Care in every detail</strong>An ambition for better handling
          and product quality.
        </p>
      </div>
      <div>
        <span>03</span>
        <p>
          <strong>Opportunity, shared</strong>Supporting skills and pathways to
          wider markets.
        </p>
      </div>
    </div>
    <section class="wrap section">
      <div class="section-heading">
        <div>
          <span class="overline">THE NUTRAGEA COLLECTION</span>
          <h2>Simple pleasures,<br />with a sense of place.</h2>
        </div>
        <a class="quiet-link" routerLink="/shop"
          >Shop all products<mat-icon>arrow_forward</mat-icon></a
        >
      </div>
      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="28" />Loading the collection…
        </div>
      } @else if (error()) {
        <div class="notice" role="alert">
          The collection is temporarily unavailable.<button
            mat-button
            (click)="load()"
          >
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
        <div class="empty editorial-empty">
          <mat-icon>spa</mat-icon>
          <h3>Our collection is being prepared.</h3>
          <p>
            For product availability and bulk enquiries, get in touch with us.
          </p>
          <a mat-stroked-button routerLink="/wholesale">Make an enquiry</a>
        </div>
      }
      @if (categories().length) {
        <div class="category-links">
          @for (category of categories(); track category.id) {
            <a routerLink="/shop" [queryParams]="{ category: category.id }"
              >{{ category.name }}<mat-icon>north_east</mat-icon></a
            >
          }
        </div>
      }
    </section>
    <section class="purpose-band">
      <div class="wrap purpose-grid">
        <div>
          <span class="overline">MORE THAN WHAT WE SELL</span>
          <h2>A stronger future<br />starts close to home.</h2>
        </div>
        <div>
          <p>
            Our purpose is to connect regional products with wider markets while
            helping local people build practical skills and earning
            opportunities.
          </p>
          <p class="muted">
            Farmer training, community awareness, and future education and
            health initiatives are part of that ambition. Follow our published
            programmes to see what is planned and what takes place.
          </p>
          <a mat-stroked-button routerLink="/impact"
            >Explore our impact programmes<mat-icon iconPositionEnd
              >arrow_forward</mat-icon
            ></a
          >
        </div>
      </div>
    </section>
    <section class="wrap section">
      <div class="section-heading">
        <div>
          <span class="overline">PEOPLE, PLACE & PROGRESS</span>
          <h2>Stories worth following.</h2>
        </div>
        <a class="quiet-link" routerLink="/stories"
          >Visit the journal<mat-icon>arrow_forward</mat-icon></a
        >
      </div>
      @if (stories().length) {
        <div class="story-grid">
          @for (story of stories(); track story.id) {
            <a class="story-card" [routerLink]="['/stories', story.slug]">
              @if (story.images[0]) {
                <img
                  [src]="story.images[0].url"
                  [alt]="story.images[0].alt"
                  width="600"
                  height="380"
                  loading="lazy"
                />
              }
              <span class="overline">{{ story.type }}</span>
              <h3>{{ story.title }}</h3>
              <p>{{ story.summary }}</p>
              <span class="quiet-link"
                >Read story<mat-icon>arrow_forward</mat-icon></span
              ></a
            >
          }
        </div>
      } @else {
        <div class="journal-note">
          <mat-icon>auto_stories</mat-icon>
          <div>
            <h3>Space for real stories.</h3>
            <p>
              Training reports, event updates, and community stories will appear
              here as they are published.
            </p>
          </div>
        </div>
      }
    </section>
    <section class="wholesale-band wrap">
      <div>
        <span class="overline">LET’S OPEN NEW DOORS</span>
        <h2>Local origins.<br />International conversations.</h2>
        <p>
          Interested in sourcing regional products for your business? Tell us
          what you are looking for.
        </p>
      </div>
      <a mat-flat-button routerLink="/wholesale"
        >Wholesale & export enquiries<mat-icon iconPositionEnd
          >north_east</mat-icon
        ></a
      >
    </section>
  `,
})
export class HomeComponent {
  private api = inject(ApiService);
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  stories = signal<Content[]>([]);
  loading = signal(true);
  error = signal(false);
  constructor() {
    inject(SeoService).set(
      "Regional products, shared possibilities",
      "Explore Nutragea products and our ambition for producer skills and local livelihoods in Gilgit-Baltistan.",
      "/",
      "/assets/editorial-food.png",
    );
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set(false);
    this.api.products({ pageSize: 4, featured: "true" }).subscribe({
      next: (p) => {
        this.products.set(p.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
    this.api
      .categories()
      .subscribe({ next: (c) => this.categories.set(c), error: () => {} });
    this.api
      .content("Story")
      .subscribe({
        next: (s) => this.stories.set(s.slice(0, 3)),
        error: () => {},
      });
  }
}
