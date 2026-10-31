import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { finalize } from "rxjs";
import { ApiService } from "../core/api.service";
import { SeoService } from "../core/seo.service";
import { message } from "../core/interceptor";
import { UI } from "../shared/ui";
@Component({
  selector: "app-enquiry",
  imports: [RouterLink, ReactiveFormsModule, ...UI],
  template: `<div class="wrap page">
    <div class="breadcrumbs">
      <a routerLink="/">Home</a><span>/</span
      >{{ wholesale ? "Wholesale & export" : "Contact" }}
    </div>
    <div class="enquiry-grid">
      <div>
        <span class="overline">{{
          wholesale ? "LET’S OPEN NEW DOORS" : "LET’S TALK"
        }}</span>
        <h1>
          {{
            wholesale
              ? "Local origins. Wider possibilities."
              : "A conversation starts here."
          }}
        </h1>
        <p>
          {{
            wholesale
              ? "Tell us about the products and quantities your business is looking for. We will review sourcing and destination requirements before confirming availability or delivery."
              : "Questions about products, training, or a possible collaboration? Send us a message."
          }}
        </p>
        <div class="notice">
          International sourcing is handled by enquiry. Shipping eligibility,
          product specifications, and commercial terms must be confirmed
          separately.
        </div>
      </div>
      <section class="panel">
        @if (sent()) {
          <div class="success-state">
            <mat-icon>task_alt</mat-icon>
            <h2>Thank you for reaching out.</h2>
            <p>
              Your enquiry has been received. We will use your contact details
              to respond.
            </p>
            <button mat-stroked-button (click)="sent.set(false)">
              Send another enquiry
            </button>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()">
            <h2>
              {{ wholesale ? "Tell us what you need." : "How can we help?" }}
            </h2>
            <div class="form-grid">
              <mat-form-field appearance="outline"
                ><mat-label>Your name</mat-label
                ><input
                  matInput
                  formControlName="name"
                  autocomplete="name"
                  maxlength="150"
                /><mat-error>Enter your name.</mat-error></mat-form-field
              ><mat-form-field appearance="outline"
                ><mat-label>Email address</mat-label
                ><input
                  matInput
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  maxlength="254"
                /><mat-error
                  >Enter a valid email address.</mat-error
                ></mat-form-field
              >
              @if (wholesale) {
                @for (field of wholesaleFields; track field.key) {
                  <mat-form-field appearance="outline"
                    ><mat-label>{{ field.label }}</mat-label
                    ><input
                      matInput
                      [formControlName]="field.key"
                      [maxlength]="field.max"
                    /><mat-error
                      >This field is required.</mat-error
                    ></mat-form-field
                  >
                }
              }
              <mat-form-field appearance="outline" class="full"
                ><mat-label>Your message</mat-label
                ><textarea
                  matInput
                  formControlName="message"
                  rows="6"
                  maxlength="10000"
                ></textarea
                ><mat-error>Enter your message.</mat-error></mat-form-field
              >
            </div>
            <div class="honeypot" aria-hidden="true">
              <label
                >Website<input
                  formControlName="website"
                  tabindex="-1"
                  autocomplete="off"
              /></label>
            </div>
            <p class="small muted">
              We use these details to respond to your enquiry. Do not include
              payment details or sensitive personal records.
            </p>
            @if (error()) {
              <div class="error-state" role="alert">{{ error() }}</div>
            }
            <button mat-flat-button type="submit" [disabled]="busy()">
              {{ busy() ? "Sending…" : "Send enquiry"
              }}<mat-icon iconPositionEnd>arrow_forward</mat-icon>
            </button>
          </form>
        }
      </section>
    </div>
  </div>`,
})
export class EnquiryComponent {
  private api = inject(ApiService);
  wholesale = inject(ActivatedRoute).snapshot.data["wholesale"] === true;
  form = new FormGroup({
    name: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    email: new FormControl("", {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.maxLength(254),
      ],
    }),
    business: new FormControl("", { nonNullable: true }),
    country: new FormControl("", { nonNullable: true }),
    products: new FormControl("", { nonNullable: true }),
    quantity: new FormControl("", { nonNullable: true }),
    message: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(10000)],
    }),
    website: new FormControl("", { nonNullable: true }),
  });
  wholesaleFields = [
    { key: "business", label: "Business name", max: 150 },
    { key: "country", label: "Country", max: 100 },
    { key: "products", label: "Products of interest", max: 500 },
    { key: "quantity", label: "Approximate quantity", max: 200 },
  ];
  busy = signal(false);
  sent = signal(false);
  error = signal("");
  constructor() {
    inject(SeoService).set(
      this.wholesale ? "Wholesale and export enquiries" : "Contact us",
      "Get in touch with Nutragea about products, sourcing, or collaboration.",
      this.wholesale ? "/wholesale" : "/contact",
    );
    if (this.wholesale)
      for (const field of this.wholesaleFields)
        this.form
          .get(field.key)!
          .addValidators([
            Validators.required,
            Validators.maxLength(field.max),
          ]);
  }
  submit() {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set("");
    this.api
      .enquiry({
        ...this.form.getRawValue(),
        type: this.wholesale ? "Wholesale" : "Contact",
      })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.form.reset();
          this.sent.set(true);
        },
        error: (e) => this.error.set(message(e)),
      });
  }
}
