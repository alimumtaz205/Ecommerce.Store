import { Component, inject, signal, computed } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import {
  combineLatest,
  debounceTime,
  startWith,
  switchMap,
  of,
  catchError,
  finalize,
  tap,
} from "rxjs";
import { ApiService } from "../core/api.service";
import { CartService } from "../core/cart.service";
import { CheckoutService } from "../core/checkout.service";
import { Settings, Quote } from "../core/models";
import { message } from "../core/interceptor";
import { MoneyPipe } from "../shared/money.pipe";
import { UI } from "../shared/ui";
@Component({
  selector: "app-checkout",
  imports: [RouterLink, ReactiveFormsModule, MoneyPipe, ...UI],
  template: `<div class="wrap page">
    <div class="breadcrumbs">
      <a routerLink="/cart">Your bag</a><span>/</span>Checkout
    </div>
    <header class="page-title">
      <span class="overline">ONE LAST STEP</span>
      <h1>Good things are on their way.</h1>
      <p>
        Enter your delivery details. Your final total is checked before the
        order is placed.
      </p>
    </header>
    @if (!settings()) {
      <div class="notice">
        {{
          settingsError()
            ? "Checkout is temporarily unavailable. Please try again later."
            : "Loading checkout…"
        }}
      </div>
    } @else if (!settings()!.checkoutAvailable) {
      <div class="empty">
        <mat-icon>storefront</mat-icon>
        <h2>Online ordering is not available right now.</h2>
        <p>Contact us about your selection or send a sourcing enquiry.</p>
        <a mat-flat-button routerLink="/contact">Contact Nutragea</a>
      </div>
    } @else if (!cart.lines().length) {
      <div class="empty">
        <h2>Your bag is empty.</h2>
        <a mat-flat-button routerLink="/shop">Browse products</a>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" class="checkout-layout">
        <fieldset class="panel checkout-form" [disabled]="busy()">
          <h2>Delivery details</h2>
          <p class="small muted">Guest checkout · Pakistan delivery</p>
          <div class="form-grid">
            @for (field of fields; track field.key) {
              <mat-form-field
                appearance="outline"
                [class.full]="field.key === 'address'"
                ><mat-label>{{ field.label }}</mat-label
                ><input
                  matInput
                  [type]="field.type || 'text'"
                  [formControlName]="field.key"
                  [autocomplete]="field.autocomplete"
                  [maxlength]="field.max"
                /><mat-error
                  >Enter a valid {{ field.label.toLowerCase() }}.</mat-error
                ></mat-form-field
              >
            }
            <mat-form-field appearance="outline"
              ><mat-label>Country</mat-label
              ><input matInput value="Pakistan" readonly /></mat-form-field
            ><mat-form-field appearance="outline"
              ><mat-label>Delivery option</mat-label
              ><mat-select formControlName="shippingId">
                @for (zone of settings()!.shipping; track zone.id) {
                  <mat-option [value]="zone.id"
                    >{{ zone.name }} · {{ zone.charge | money }}</mat-option
                  >
                }</mat-select
              ><mat-error>Select a delivery option.</mat-error></mat-form-field
            >
          </div>
          <div class="payment-choice">
            <mat-icon>payments</mat-icon>
            <div>
              <strong>Cash on delivery</strong>
              <p>
                Payment is collected when delivery is completed. Placing an
                order does not mark it paid.
              </p>
            </div>
          </div>
          <mat-checkbox formControlName="acceptTerms"
            >I agree to the
            <a routerLink="/pages/terms" target="_blank" rel="noopener"
              >terms</a
            >
            and have read the
            <a routerLink="/pages/privacy" target="_blank" rel="noopener"
              >privacy policy</a
            >.</mat-checkbox
          >
          @if (
            form.controls.acceptTerms.touched &&
            form.controls.acceptTerms.invalid
          ) {
            <p class="field-error">Please accept the terms.</p>
          }
        </fieldset>
        <aside class="panel order-summary">
          <span class="overline">YOUR ORDER</span>
          <h2>Final review</h2>
          @if (quoteBusy()) {
            <div class="loading">
              <mat-spinner diameter="22" />Checking totals…
            </div>
          } @else if (quote()) {
            @for (line of quote()!.items; track line.variantId) {
              <div class="summary-line">
                <span
                  >{{ line.product
                  }}<small>{{ line.label }} × {{ line.quantity }}</small></span
                ><strong>{{ line.lineTotal | money }}</strong>
              </div>
            }
            <div class="summary-line">
              <span>Subtotal</span
              ><strong>{{ quote()!.subtotal | money }}</strong>
            </div>
            <div class="summary-line">
              <span>Delivery</span
              ><strong>{{ quote()!.shipping | money }}</strong>
            </div>
            @if (quote()!.discount) {
              <div class="summary-line">
                <span>Discount</span
                ><strong>−{{ quote()!.discount | money }}</strong>
              </div>
            }
            <div class="summary-line total">
              <span>Total</span><strong>{{ quote()!.total | money }}</strong>
            </div>
          }
          @if (error()) {
            <div class="error-state" role="alert">{{ error() }}</div>
            <button mat-button type="button" (click)="refreshQuote()">
              Refresh quote
            </button>
          }
          <button
            mat-flat-button
            type="submit"
            [disabled]="busy() || quoteBusy() || !quote()"
          >
            {{ busy() ? "Placing order…" : "Place COD order"
            }}<mat-icon iconPositionEnd>arrow_forward</mat-icon>
          </button>
          <p class="small muted">
            Your order awaits staff confirmation. Save the private access code
            shown after ordering so you can check its status.
          </p>
          <a class="quiet-link" routerLink="/cart">Edit your bag</a>
        </aside>
      </form>
    }
  </div>`,
})
export class CheckoutComponent {
  private api = inject(ApiService);
  readonly cart = inject(CartService);
  private checkout = inject(CheckoutService);
  settings = signal<Settings | null>(null);
  settingsError = signal(false);
  quote = signal<Quote | null>(null);
  quoteBusy = signal(false);
  busy = signal(false);
  error = signal("");
  private retry = signal(0);
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
    phone: new FormControl("", {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^[+0-9 ()-]{7,30}$/),
      ],
    }),
    address: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)],
    }),
    city: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    postalCode: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20)],
    }),
    shippingId: new FormControl<number | null>(null, Validators.required),
    acceptTerms: new FormControl(false, {
      nonNullable: true,
      validators: Validators.requiredTrue,
    }),
  });
  fields = [
    {
      key: "name",
      label: "Full name",
      autocomplete: "name",
      max: 150,
      type: "text",
    },
    {
      key: "email",
      label: "Email address",
      autocomplete: "email",
      max: 254,
      type: "email",
    },
    {
      key: "phone",
      label: "Phone number",
      autocomplete: "tel",
      max: 30,
      type: "tel",
    },
    {
      key: "address",
      label: "Street address",
      autocomplete: "street-address",
      max: 500,
      type: "text",
    },
    {
      key: "city",
      label: "City",
      autocomplete: "address-level2",
      max: 100,
      type: "text",
    },
    {
      key: "postalCode",
      label: "Postal code",
      autocomplete: "postal-code",
      max: 20,
      type: "text",
    },
  ];
  constructor() {
    this.api
      .settings()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (s) => {
          this.settings.set(s);
          if (s.shipping[0])
            this.form.controls.shippingId.setValue(s.shipping[0].id);
        },
        error: () => this.settingsError.set(true),
      });
    combineLatest([
      toObservable(
        computed(() => ({ items: this.cart.lines(), retry: this.retry() })),
      ),
      this.form.controls.shippingId.valueChanges.pipe(
        startWith(null as number | null),
      ),
    ])
      .pipe(
        tap(() => {
          this.quote.set(null);
          this.quoteBusy.set(true);
        }),
        debounceTime(180),
        switchMap(([{ items }, id]) =>
          items.length && id
            ? this.api.quote(items, id).pipe(
                catchError((e) => {
                  this.error.set(message(e));
                  return of(null);
                }),
              )
            : of(null),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((q) => {
        this.quote.set(q);
        this.quoteBusy.set(false);
        if (q) this.error.set("");
      });
  }
  refreshQuote() {
    this.retry.update((n) => n + 1);
  }
  submit() {
    if (this.busy() || !this.quote()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set("");
    const values = this.form.getRawValue();
    this.checkout
      .place({
        ...values,
        items: this.cart.lines(),
        shippingId: values.shippingId,
        countryCode: "PK",
        expectedTotal: this.quote()!.total,
        expectedPolicyRevision: this.quote()!.policyRevision,
      })
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(),
      )
      .subscribe({
        error: (e) => {
          this.error.set(message(e));
          this.form.controls.acceptTerms.setValue(false);
        },
      });
  }
}
