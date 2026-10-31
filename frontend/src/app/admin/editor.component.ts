import { Component, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { forkJoin, of, finalize } from "rxjs";
import { ToastrService } from "ngx-toastr";
import { ApiService } from "../core/api.service";
import { message } from "../core/interceptor";
import { Row } from "../core/models";
import { UI } from "../shared/ui";
type Value = string | number | boolean | number[] | null;
interface Option {
  value: Value;
  label: string;
}
interface Field {
  key: string;
  label: string;
  type?:
    | "text"
    | "area"
    | "number"
    | "select"
    | "multi"
    | "check"
    | "datetime-local";
  required?: boolean;
  options?: Option[];
  value?: Value;
  max?: number;
  min?: number;
  disabled?: boolean;
}
export interface EditorData {
  kind: string;
  row?: Row;
  action?: string;
}
@Component({
  selector: "app-editor",
  imports: [ReactiveFormsModule, ...UI],
  template: `<h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      @if (!ready()) {
        @if (error()) {
          <div class="error-state" role="alert">{{ error() }}</div>
          <button mat-button (click)="load()">Retry</button>
        } @else {
          <div class="loading">
            <mat-spinner diameter="28" />Loading options…
          </div>
        }
      } @else {
        <form [formGroup]="form" id="admin-editor" (ngSubmit)="save()">
          <div class="notice small">{{ help }}</div>
          @if (error()) {
            <div class="error-state" role="alert">{{ error() }}</div>
          }
          <div class="form-grid">
            @for (field of fields; track field.key) {
              @if (field.type === "check") {
                <mat-checkbox [formControlName]="field.key">{{
                  field.label
                }}</mat-checkbox>
              } @else {
                <mat-form-field
                  appearance="outline"
                  [class.full]="field.type === 'area'"
                  ><mat-label>{{ field.label }}</mat-label>
                  @switch (field.type) {
                    @case ("select") {
                      <mat-select [formControlName]="field.key">
                        @for (o of field.options || []; track o.value) {
                          <mat-option [value]="o.value">{{
                            o.label
                          }}</mat-option>
                        }
                      </mat-select>
                    }
                    @case ("multi") {
                      <mat-select [formControlName]="field.key" multiple>
                        @for (o of field.options || []; track o.value) {
                          <mat-option [value]="o.value">{{
                            o.label
                          }}</mat-option>
                        }
                      </mat-select>
                    }
                    @case ("area") {
                      <textarea
                        matInput
                        rows="5"
                        [formControlName]="field.key"
                        [maxlength]="field.max || 30000"
                      ></textarea>
                    }
                    @default {
                      <input
                        matInput
                        [type]="field.type || 'text'"
                        [formControlName]="field.key"
                        [attr.maxlength]="
                          field.type === 'number' ? null : field.max
                        "
                        [attr.min]="field.min"
                        [attr.step]="field.type === 'number' ? 'any' : null"
                      />
                    }
                  }
                  <mat-error
                    >Enter a valid {{ field.label.toLowerCase() }}.</mat-error
                  ></mat-form-field
                >
              }
            }
          </div>
        </form>
      }</mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close [disabled]="busy()">Cancel</button
      ><button
        mat-flat-button
        type="submit"
        form="admin-editor"
        [disabled]="!ready() || busy()"
      >
        {{ busy() ? "Saving…" : "Save changes" }}
      </button></mat-dialog-actions
    >`,
})
export class EditorComponent {
  data = inject<EditorData>(MAT_DIALOG_DATA);
  private api = inject(ApiService);
  private toast = inject(ToastrService);
  private ref = inject(MatDialogRef<EditorComponent>);
  private destroy = inject(DestroyRef);
  form = new FormGroup<Record<string, FormControl<Value>>>({});
  fields: Field[] = [];
  ready = signal(false);
  busy = signal(false);
  error = signal("");
  title = (this.data.row ? "Edit " : "Create ") + this.data.kind;
  help =
    "Drafts remain private. Publication requires approved content and media.";
  lookups: Record<string, Row[]> = {};
  constructor() {
    this.load();
  }
  load() {
    this.ready.set(false);
    this.error.set("");
    const needed: Record<string, string[]> = {
      products: ["categories", "operational-products", "media"],
      variants: ["products"],
      allocations: ["variants", "lots"],
      content: ["media"],
    };
    const kinds = needed[this.data.kind] || [];
    const request = kinds.length
      ? forkJoin(
          Object.fromEntries(kinds.map((k) => [k, this.api.adminAll(k)])),
        )
      : of({} as Record<string, Row[]>);
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (lookup) => {
        this.lookups = lookup;
        this.configure();
        this.ready.set(true);
      },
      error: (e) => this.error.set(message(e)),
    });
  }
  private options(kind: string): Option[] {
    return (this.lookups[kind] || []).map((r) => ({
      value: r.id,
      label: `#${r.id} · ${r["name"] || r["label"] || r["code"] || r["alt_text"] || r["slug"]}${r["sku"] ? " · " + r["sku"] : ""}`,
    }));
  }
  private configure() {
    const row = this.data.row;
    const text = (
      key: string,
      label: string,
      required = true,
      max = 150,
    ): Field => ({ key, label, required, max });
    const select = (
      key: string,
      label: string,
      options: Option[],
      value?: Value,
    ): Field => ({
      key,
      label,
      type: "select",
      required: true,
      options,
      value,
    });
    const check = (key: string, label: string, value = false): Field => ({
      key,
      label,
      type: "check",
      value,
    });
    const number = (key: string, label: string, min = 0): Field => ({
      key,
      label,
      type: "number",
      required: true,
      min,
    });
    const images: Field = {
      key: "imageIds",
      label: "Approved media",
      type: "multi",
      options: this.options("media"),
      value: [],
    };
    const published = check("published", "Published");
    const active = check("isActive", "Active", true);
    switch (this.data.kind) {
      case "categories":
        this.fields = [
          text("name", "Category name", true, 100),
          text("slug", "URL slug", true, 100),
          active,
        ];
        break;
      case "products":
        this.fields = [
          text("name", "Product name"),
          text("slug", "URL slug"),
          select("categoryId", "Category", this.options("categories")),
          {
            ...select(
              "operationalProductId",
              "Operational product",
              this.options("operational-products"),
            ),
            disabled: !!row,
          },
          text("summary", "Short description", true, 500),
          { ...text("description", "Description", true, 15000), type: "area" },
          text("origin", "Origin", true, 200),
          { ...text("ingredients", "Ingredients", true, 3000), type: "area" },
          {
            ...text(
              "allergens",
              "Allergens / relevant declaration",
              true,
              3000,
            ),
            type: "area",
          },
          {
            ...text("storage", "Storage instructions", true, 3000),
            type: "area",
          },
          images,
          published,
          check("featured", "Featured"),
        ];
        break;
      case "variants":
        this.fields = [
          {
            ...select(
              "productId",
              "Storefront product",
              this.options("products"),
            ),
            disabled: !!row,
          },
          text("label", "Pack label", true, 100),
          text("sku", "SKU", true, 100),
          number("price", "Price · PKR", 0.01),
          {
            ...number("netWeightKg", "Net weight per pack · kg", 0.001),
            disabled: !!row,
          },
          active,
        ];
        this.help =
          "The product and pack weight cannot change after creation. Prices are snapshotted on orders.";
        break;
      case "allocations":
        this.fields = [
          select("variantId", "Variant", this.options("variants")),
          select("lotId", "Warehouse packaging lot", this.options("lots")),
          number("quantity", "Packs to allocate", 1),
        ];
        this.help =
          "This moves packs out of warehouse availability into store allocation. Product and pack weight must match exactly.";
        break;
      case "release":
        this.fields = [number("quantity", "Unreserved packs to return", 1)];
        this.help =
          "Only unreserved allocated packs can be returned to warehouse availability.";
        break;
      case "shipping":
        this.fields = [
          text("name", "Delivery option name", true, 100),
          {
            ...text("countryCode", "Country code"),
            value: "PK",
            disabled: true,
          },
          number("charge", "Delivery charge · PKR"),
          active,
        ];
        this.help =
          "The first checkout supports Pakistan only. Enter your actual delivery charge and coverage in the shipping policy.";
        break;
      case "content":
        this.fields = [
          {
            ...select(
              "type",
              "Content type",
              ["Page", "Programme", "Story", "Event", "Policy"].map((s) => ({
                value: s,
                label: s,
              })),
              "Page",
            ),
            disabled: row?.["type"] === "Policy",
          },
          { ...text("slug", "URL slug"), disabled: row?.["type"] === "Policy" },
          text("title", "Title", true, 200),
          text("summary", "Summary", false, 500),
          { ...text("body", "Body · plain text", false, 30000), type: "area" },
          select(
            "programmeStatus",
            "Programme status",
            ["Planned", "Active", "Completed"].map((s) => ({
              value: s,
              label: s,
            })),
            "Planned",
          ),
          {
            key: "eventDate",
            label: "Event date · local time",
            type: "datetime-local",
          },
          images,
          published,
        ];
        this.help =
          "Publish only accurate, approved content. Community photographs require documentary status, rights, and consent. Body text is safely displayed as plain text.";
        break;
      case "settings":
        this.fields = [
          check("checkoutEnabled", "Open checkout"),
          check("codEnabled", "Enable cash on delivery"),
          text("supportEmail", "Support email", false, 254),
          text("supportPhone", "Support phone", false, 30),
          {
            ...text("companyAddress", "Business address", false, 500),
            type: "area",
          },
        ];
        this.help =
          "Before opening checkout, publish shipping/returns/privacy/terms policies, activate shipping, and provide real support details.";
        break;
      case "order-action":
        this.fields = [
          { ...text("reason", "Action reason", true, 1000), type: "area" },
        ];
        this.title =
          this.data.action === "Deliver"
            ? "Confirm delivery and COD collection"
            : this.data.action + " order";
        this.help =
          this.data.action === "Ship"
            ? "Shipment consumes the existing store reservation and creates a linked Batch Tracker dispatch. Held stock cannot ship."
            : this.data.action === "Cancel"
              ? "Cancellation releases unshipped reservations. Shipped orders cannot be cancelled here."
              : "Confirm this operational action only when it has actually happened.";
        break;
      case "enquiry-status":
        this.fields = [
          select(
            "status",
            "Enquiry status",
            [
              { value: "New", label: "New" },
              { value: "Handled", label: "Handled" },
            ],
            "Handled",
          ),
        ];
        this.help = "This records handling status. It does not send an email.";
        break;
    }
    const aliases: Record<string, string> = {
      categoryId: "category_id",
      operationalProductId: "operational_product_id",
      productId: "product_id",
      netWeightKg: "net_weight_kg",
      countryCode: "country_code",
      isActive: "is_active",
      programmeStatus: "programme_status",
      eventDate: "event_date",
      checkoutEnabled: "checkout_enabled",
      codEnabled: "cod_enabled",
      supportEmail: "support_email",
      supportPhone: "support_phone",
      companyAddress: "company_address",
    };
    for (const field of this.fields) {
      let value = row?.[aliases[field.key] || field.key] as Value | undefined;
      if (field.key === "imageIds") {
        try {
          value = JSON.parse(String(row?.["image_ids"] || "[]")) as number[];
        } catch {
          value = [];
        }
      }
      if (field.type === "check")
        value = row ? !!value : (field.value ?? false);
      if (field.type === "datetime-local" && typeof value === "string")
        value = localDateTime(value);
      const validators = [];
      if (field.required) validators.push(Validators.required);
      if (field.type !== "number" && field.max)
        validators.push(Validators.maxLength(field.max));
      if (field.min !== undefined) validators.push(Validators.min(field.min));
      if (field.key === "slug")
        validators.push(Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));
      this.form.addControl(
        field.key,
        new FormControl<Value>(
          {
            value: value ?? field.value ?? null,
            disabled: field.disabled || false,
          },
          validators,
        ),
      );
    }
  }
  save() {
    if (this.busy() || !this.ready()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set("Review the highlighted fields.");
      return;
    }
    const value = this.form.getRawValue();
    const body: Record<string, unknown> = { ...value };
    for (const field of this.fields) {
      if (
        field.type === "number" ||
        (field.type === "select" &&
          !["type", "programmeStatus", "status"].includes(field.key))
      )
        body[field.key] = Number(body[field.key]);
      if (typeof body[field.key] === "string")
        body[field.key] = (body[field.key] as string).trim();
    }
    if (body["eventDate"])
      body["eventDate"] = new Date(String(body["eventDate"])).toISOString();
    else if (this.data.kind === "content") body["eventDate"] = null;
    body["version"] = Number(this.data.row?.["version"] || 0);
    let path = this.data.kind;
    let method: "POST" | "PUT" = this.data.row ? "PUT" : "POST";
    if (this.data.row) path += "/" + this.data.row.id;
    if (this.data.kind === "settings") {
      path = "settings";
      method = "PUT";
    }
    if (this.data.kind === "release") {
      path = "allocations/" + this.data.row!.id + "/release";
      method = "POST";
    }
    if (this.data.kind === "order-action") {
      path = "orders/" + this.data.row!.id + "/actions";
      body["action"] = this.data.action;
      method = "POST";
    }
    if (this.data.kind === "enquiry-status") {
      path = "enquiries/" + this.data.row!.id;
      method = "PUT";
    }
    this.busy.set(true);
    this.ref.disableClose = true;
    this.error.set("");
    this.api
      .save(path, body, method)
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: () => {
          this.toast.success("Changes saved.");
          this.ref.close(true);
        },
        error: (e) => this.error.set(message(e)),
      });
  }
}

export function localDateTime(raw: string): string {
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(raw) ? raw : raw + "Z");
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
