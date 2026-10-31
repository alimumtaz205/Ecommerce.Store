import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { switchMap, tap } from "rxjs";
import { ApiService } from "../core/api.service";
import { SeoService } from "../core/seo.service";
import { Content } from "../core/models";
import { UI } from "../shared/ui";
@Component({
  selector: "app-content-list",
  imports: [RouterLink, ...UI],
  template: `<div class="wrap page">
    <div class="breadcrumbs">
      <a routerLink="/">Home</a><span>/</span
      >{{ impact ? "Our impact" : "Journal" }}
    </div>
    <header class="page-title">
      <span class="overline">{{
        impact ? "OUR PURPOSE, IN PRACTICE" : "STORIES & EVENTS"
      }}</span>
      <h1>
        {{
          impact
            ? "A shared ambition for better livelihoods."
            : "People. Place. Progress."
        }}
      </h1>
      <p>
        {{
          impact
            ? "Explore our programme areas and their recorded status. Planned initiatives are ambitions, not claims of completed work."
            : "Training reports, awareness events, and community updates, published as the work takes place."
        }}
      </p>
    </header>
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="30" />Loading…</div>
    } @else if (error()) {
      <div class="notice" role="alert">
        This section is temporarily unavailable.<button
          mat-button
          (click)="load()"
        >
          Try again
        </button>
      </div>
    } @else if (items().length) {
      <div class="story-grid">
        @for (item of items(); track item.id) {
          <a
            class="story-card"
            [routerLink]="[impact ? '/impact' : '/stories', item.slug]"
          >
            @if (item.images[0]) {
              <img
                [src]="item.images[0].url"
                [alt]="item.images[0].alt"
                width="600"
                height="380"
                loading="lazy"
              />
            } @else {
              <div class="programme-icon">
                <mat-icon>{{ impact ? "spa" : "auto_stories" }}</mat-icon>
              </div>
            }
            <span class="overline">{{
              impact ? item.programme_status : item.type
            }}</span>
            <h2>{{ item.title }}</h2>
            <p>{{ item.summary }}</p>
            <span class="quiet-link"
              >Explore<mat-icon>arrow_forward</mat-icon></span
            ></a
          >
        }
      </div>
    } @else {
      <div class="empty">
        <mat-icon>auto_stories</mat-icon>
        <h2>Real stories take time.</h2>
        <p>Updates will appear here when they are ready to share.</p>
      </div>
    }
  </div>`,
})
export class ContentListComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  impact = this.route.snapshot.data["type"] === "Programme";
  items = signal<Content[]>([]);
  loading = signal(true);
  error = signal(false);
  constructor() {
    inject(SeoService).set(
      this.impact ? "Our impact" : "Stories and events",
      this.impact
        ? "Our planned and active programme areas for producer skills and community opportunity."
        : "Published Nutragea stories, training reports, and event updates.",
      this.impact ? "/impact" : "/stories",
    );
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set(false);
    this.api.content(this.impact ? "Programme" : undefined).subscribe({
      next: (rows) => {
        this.items.set(
          rows.filter((r) =>
            this.impact
              ? r.type === "Programme"
              : ["Story", "Event"].includes(r.type),
          ),
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
@Component({
  selector: "app-content-detail",
  imports: [RouterLink, ...UI],
  template: `<article class="wrap page article">
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="30" />Loading page…</div>
    } @else if (error()) {
      <div class="empty">
        <mat-icon>search_off</mat-icon>
        <h1>This page is unavailable.</h1>
        <p>
          It may not be published, or the service may be temporarily
          unavailable.
        </p>
        <a mat-stroked-button routerLink="/">Return home</a>
      </div>
    } @else if (item()) {
      <div class="breadcrumbs">
        <a routerLink="/">Home</a><span>/</span>{{ item()!.type }}
      </div>
      <span class="overline">{{
        item()!.type === "Programme" ? item()!.programme_status : item()!.type
      }}</span>
      <h1>{{ item()!.title }}</h1>
      <p class="article-summary">{{ item()!.summary }}</p>
      @if (item()!.event_date) {
        <p class="muted">Event: {{ eventDate() }}</p>
      }
      @if (item()!.images[0]) {
        <figure>
          <img
            [src]="item()!.images[0].url"
            [alt]="item()!.images[0].alt"
            width="1200"
            height="700"
          />
          <figcaption>{{ item()!.images[0].alt }}</figcaption>
        </figure>
      }
      <div class="article-body pre-line">{{ item()!.body }}</div>
      @if (item()!.images.length > 1) {
        <div class="gallery">
          @for (image of item()!.images.slice(1); track image.id) {
            <figure>
              <img
                [src]="image.url"
                [alt]="image.alt"
                width="600"
                height="450"
                loading="lazy"
              />
              <figcaption>{{ image.alt }}</figcaption>
            </figure>
          }
        </div>
      }
      @if (
        item()!.type === "Programme" && item()!.programme_status === "Planned"
      ) {
        <div class="notice">
          This programme is planned. This page does not claim completed
          activities or measured outcomes.
        </div>
      }
    }
  </article>`,
})
export class ContentDetailComponent {
  private api = inject(ApiService);
  private seo = inject(SeoService);
  item = signal<Content | null>(null);
  loading = signal(true);
  error = signal(false);
  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap((p) => this.api.page(p.get("slug") || "")),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (c) => {
          this.item.set(c);
          this.loading.set(false);
          const prefix =
            c.type === "Programme"
              ? "/impact/"
              : ["Story", "Event"].includes(c.type)
                ? "/stories/"
                : "/pages/";
          this.seo.set(c.title, c.summary, prefix + c.slug, c.images[0]?.url);
          if (c.type === "Story")
            this.seo.structured({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: c.title,
              description: c.summary,
              dateModified: c.updated_at,
              publisher: { "@type": "Organization", name: "Nutragea" },
            });
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
  eventDate() {
    const text = this.item()?.event_date;
    if (!text) return "";
    return new Intl.DateTimeFormat("en-PK", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Karachi",
    }).format(new Date(text.endsWith("Z") ? text : text + "Z"));
  }
}
@Component({
  selector: "app-about",
  imports: [RouterLink, ...UI],
  template: `<div class="wrap page">
    <div class="breadcrumbs">
      <a routerLink="/">Home</a><span>/</span>Our story
    </div>
    <div class="about-intro">
      <span class="overline">ROOTED IN GILGIT-BALTISTAN</span>
      <h1>A place in our hearts.<br /><em>A purpose in our work.</em></h1>
      <p>
        Nutragea brings together an ambition for regional products and a belief
        in the possibilities of local enterprise.
      </p>
    </div>
    @if (about()) {
      <article class="prose" style="white-space:pre-line">
        {{ about()!.body }}
      </article>
    }
    <section class="about-grid">
      <div>
        <h2>From local origins<br />to wider markets.</h2>
        <p>
          Our aim is to connect foods and approved local products from
          Gilgit-Baltistan with customers in Pakistan and beyond.
        </p>
        <p>
          We want to improve the journey between producer and customer through
          better skills, careful handling, and dependable product information.
        </p>
      </div>
      <div class="about-purpose">
        <span class="overline">WHAT WE ARE WORKING TOWARDS</span>
        <h3>Skills that stay in the community.</h3>
        <p>
          Farmer training, producer livelihoods, and awareness seminars are core
          areas of our ambition. Education and health awareness are future
          programme areas.
        </p>
        <a class="quiet-link" routerLink="/impact"
          >See programme status<mat-icon>arrow_forward</mat-icon></a
        >
      </div>
    </section>
    <section class="values-grid">
      <div>
        <span>01</span>
        <h3>Origin</h3>
        <p>
          A clear connection between products, their sources, and their recorded
          information.
        </p>
      </div>
      <div>
        <span>02</span>
        <h3>Care</h3>
        <p>
          An ambition for better handling, transparent information, and
          thoughtful customer service.
        </p>
      </div>
      <div>
        <span>03</span>
        <h3>Opportunity</h3>
        <p>
          A commitment to seeking practical ways for local people and products
          to reach wider markets.
        </p>
      </div>
    </section>
    <div class="wholesale-band">
      <div>
        <h2>Help shape what comes next.</h2>
        <p>
          Talk to us about sourcing, training, or a potential collaboration.
        </p>
      </div>
      <a mat-flat-button routerLink="/contact"
        >Get in touch<mat-icon iconPositionEnd>arrow_forward</mat-icon></a
      >
    </div>
  </div>`,
})
export class AboutComponent {
  about = signal<Content | null>(null);
  constructor() {
    inject(ApiService)
      .page("about")
      .subscribe({ next: (page) => this.about.set(page), error: () => {} });
    inject(SeoService).set(
      "Our story",
      "Nutragea’s regional connection and ambition for products, skills, and local livelihoods.",
      "/about",
    );
  }
}
