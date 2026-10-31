import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { finalize } from "rxjs";
import { ApiService } from "../core/api.service";
import { CheckoutService } from "../core/checkout.service";
import { OrderView } from "../core/models";
import { message } from "../core/interceptor";
import { MoneyPipe } from "../shared/money.pipe";
import { UI } from "../shared/ui";
@Component({
  selector: "app-confirmation",
  imports: [RouterLink, MoneyPipe, ...UI],
  template: `<div class="wrap page narrow">
    @if (checkout.latest()) {
      <div class="confirmation-icon"><mat-icon>task_alt</mat-icon></div>
      <span class="overline">ORDER RECEIVED</span>
      <h1>Thank you for choosing Nutragea.</h1>
      <p>
        Your COD order is awaiting staff confirmation. Payment has not been
        collected.
      </p>
      <section class="panel">
        <dl class="facts">
          <div>
            <dt>Order reference</dt>
            <dd>{{ checkout.latest()!.reference }}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{{ checkout.latest()!.total | money }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{{ checkout.latest()!.status }}</dd>
          </div>
        </dl>
        <label class="overline" for="order-access">PRIVATE ACCESS CODE</label
        ><input
          id="order-access"
          class="access-code"
          [value]="checkout.latest()!.accessCode"
          readonly
          (focus)="select($event)"
        />
        <p class="small muted">
          Save your reference and this code before leaving. They are not stored
          in browser storage and are not automatically emailed. Anyone with both
          can view your order status.
        </p>
        <button mat-stroked-button (click)="copy()">
          <mat-icon>content_copy</mat-icon
          >{{ copied() ? "Copied" : "Copy reference & code" }}
        </button>
        <p class="small muted">{{ copyError() }}</p>
      </section>
      <div class="button-row">
        <a mat-flat-button routerLink="/track">Track an order</a
        ><a class="quiet-link" routerLink="/shop"
          >Back to shop<mat-icon>arrow_forward</mat-icon></a
        >
      </div>
    } @else {
      <div class="empty">
        <h1>Find your order.</h1>
        <p>Use the reference and private access code saved after checkout.</p>
        <a mat-flat-button routerLink="/track">Track an order</a>
      </div>
    }
  </div>`,
})
export class ConfirmationComponent {
  readonly checkout = inject(CheckoutService);
  copied = signal(false);
  copyError = signal("");
  select(e: Event) {
    (e.target as HTMLInputElement).select();
  }
  async copy() {
    try {
      const o = this.checkout.latest()!;
      await navigator.clipboard.writeText(`Nutragea order: ${o.reference}
Private access code: ${o.accessCode}`);
      this.copied.set(true);
    } catch {
      this.copyError.set(
        "Clipboard is unavailable. Select and copy your reference and code manually.",
      );
    }
  }
}
@Component({
  selector: "app-order-track",
  imports: [RouterLink, ReactiveFormsModule, MoneyPipe, ...UI],
  template: `<div class="wrap page narrow">
    <span class="overline">YOUR ORDER JOURNEY</span>
    <h1>Check your order.</h1>
    <p>Enter the reference and private access code saved after checkout.</p>
    <form class="panel" [formGroup]="form" (ngSubmit)="lookup()">
      <mat-form-field appearance="outline"
        ><mat-label>Order reference</mat-label
        ><input
          matInput
          formControlName="reference"
          maxlength="50"
          autocomplete="off"
        /><mat-error>Enter your reference.</mat-error></mat-form-field
      ><mat-form-field appearance="outline"
        ><mat-label>Private access code</mat-label
        ><input
          matInput
          type="password"
          formControlName="code"
          maxlength="64"
          autocomplete="off"
        /><mat-error
          >Enter the 64-character private access code.</mat-error
        ></mat-form-field
      >
      @if (error()) {
        <div class="error-state" role="alert">{{ error() }}</div>
      }
      <button mat-flat-button type="submit" [disabled]="busy()">
        {{ busy() ? "Looking up…" : "View order" }}
      </button>
    </form>
    @if (data()) {
      <section class="panel">
        <span class="badge">{{ data()!.order["status"] }}</span>
        <h2>{{ data()!.order["reference"] }}</h2>
        <p>
          Payment:
          {{
            data()!.order["payment_status"] === "Collected"
              ? "Collected"
              : "Due on delivery"
          }}
        </p>
        @for (item of data()!.items; track $index) {
          <div class="summary-line">
            <span
              >{{ item["product_name"]
              }}<small
                >{{ item["variant_label"] }} × {{ item["quantity"] }}</small
              ></span
            ><strong>{{ number(item["line_total"]) | money }}</strong>
          </div>
        }
        <div class="summary-line total">
          <span>Total</span
          ><strong>{{ number(data()!.order["total"]) | money }}</strong>
        </div>
        <a class="quiet-link" routerLink="/contact"
          >Need help with this order?<mat-icon>arrow_forward</mat-icon></a
        >
      </section>
    }
  </div>`,
})
export class TrackComponent {
  private api = inject(ApiService);
  form = new FormGroup({
    reference: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    code: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-f0-9]{64}$/)],
    }),
  });
  data = signal<OrderView | null>(null);
  busy = signal(false);
  error = signal("");
  number(value: unknown) {
    return Number(value);
  }
  lookup() {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set("");
    this.data.set(null);
    const v = this.form.getRawValue();
    this.api
      .lookup(v.reference.trim(), v.code)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (d) => this.data.set(d),
        error: (e) => this.error.set(message(e)),
      });
  }
}
