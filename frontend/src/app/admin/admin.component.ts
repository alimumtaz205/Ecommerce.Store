import { Component, DestroyRef, inject, signal, computed } from "@angular/core";
import {
  ActivatedRoute,
  RouterLink,
  RouterOutlet,
  RouterLinkActive,
  Router,
} from "@angular/router";
import {
  FormControl,
  ReactiveFormsModule,
  FormGroup,
  Validators,
} from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatDialog, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { firstValueFrom, finalize } from "rxjs";
import { ApiService } from "../core/api.service";
import { AuthService } from "../core/auth.service";
import { message } from "../core/interceptor";
import { Row, OrderView } from "../core/models";
import { UI } from "../shared/ui";
import { MoneyPipe } from "../shared/money.pipe";
import { EditorComponent } from "./editor.component";
@Component({
  selector: "app-staff-shell",
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ...UI],
  template: `<div class="staff-wrap wrap">
    <div class="staff-heading">
      <div>
        <span class="overline">STAFF WORKSPACE</span>
        <h1>Commerce & content</h1>
        <p>
          Signed in as {{ auth.user()?.username }}. Existing Batch Tracker
          operations remain separate.
        </p>
      </div>
      <button mat-stroked-button (click)="logout()">
        <mat-icon>logout</mat-icon>Sign out
      </button>
    </div>
    <nav class="staff-nav" aria-label="Staff modules">
      @for (item of links; track item.path) {
        <a [routerLink]="'/staff/' + item.path" routerLinkActive="active">{{
          item.label
        }}</a>
      }
    </nav>
    <router-outlet />
  </div>`,
})
export class StaffShellComponent {
  readonly auth = inject(AuthService);
  links = [
    { path: "products", label: "Products" },
    { path: "variants", label: "Variants" },
    { path: "categories", label: "Categories" },
    { path: "allocations", label: "Store stock" },
    { path: "orders", label: "Orders" },
    { path: "content", label: "Content" },
    { path: "media", label: "Media" },
    { path: "shipping", label: "Delivery" },
    { path: "enquiries", label: "Enquiries" },
    { path: "settings", label: "Settings" },
  ];
  logout() {
    this.auth.logout().subscribe({ error: () => {} });
  }
}
@Component({
  selector: "app-staff-login",
  imports: [ReactiveFormsModule, RouterLink, ...UI],
  template: `<div class="wrap page narrow">
    <span class="overline">NUTRAGEA STAFF</span>
    <h1>Welcome back.</h1>
    <p>Use your existing Batch Tracker administrator account.</p>
    <form class="panel" [formGroup]="form" (ngSubmit)="login()">
      <mat-form-field appearance="outline"
        ><mat-label>Username</mat-label
        ><input
          matInput
          formControlName="username"
          autocomplete="username"
          maxlength="100"
        /><mat-error>Enter your username.</mat-error></mat-form-field
      ><mat-form-field appearance="outline"
        ><mat-label>Password</mat-label
        ><input
          matInput
          type="password"
          formControlName="password"
          autocomplete="current-password"
          maxlength="128"
        /><mat-error>Enter your password.</mat-error></mat-form-field
      >
      @if (error()) {
        <div class="error-state" role="alert">{{ error() }}</div>
      }
      <button mat-flat-button type="submit" [disabled]="busy()">
        {{ busy() ? "Signing in…" : "Sign in" }}
      </button>
      <p class="small muted">
        Tokens remain in memory. Refreshing requires signing in again.
      </p>
    </form>
    <a class="quiet-link" routerLink="/">Back to the website</a>
  </div>`,
})
export class StaffLoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  busy = signal(false);
  error = signal("");
  form = new FormGroup({
    username: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    password: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(128)],
    }),
  });
  login() {
    debugger
    if (this.busy() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set("");
    const v = this.form.getRawValue();
    this.auth
      .login(v.username, v.password)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (r) => {
          this.form.controls.password.reset();
          if (r.user.role !== "Admin") {
            this.error.set(
              "An administrator account is required for this workspace.",
            );
            return;
          }
          void this.router.navigate(["/staff/products"]);
        },
        error: (e) => this.error.set(message(e)),
      });
  }
}
const columns: Record<string, string[]> = {
  products: ["name", "slug", "published", "featured"],
  variants: ["label", "sku", "price", "net_weight_kg", "is_active"],
  categories: ["name", "slug", "is_active"],
  allocations: ["name", "label", "code", "quantity", "reserved", "quality"],
  orders: ["reference", "name", "total", "status", "payment_status"],
  content: ["title", "type", "programme_status", "published"],
  shipping: ["name", "country_code", "charge", "is_active"],
  enquiries: ["name", "email", "type", "status", "created_at"],
};
@Component({
  selector: "app-admin-list",
  imports: [ReactiveFormsModule, ...UI],
  template: `<section class="admin-section">
    <div class="section-heading">
      <div>
        <h2>{{ label() }}</h2>
        <p class="muted small">
          Filter and sort the current page. Stock and order changes are audited.
        </p>
      </div>
      <div class="button-row">
        <button
          mat-icon-button
          aria-label="Refresh records"
          [disabled]="loading()"
          (click)="load()"
        >
          <mat-icon>refresh</mat-icon>
        </button>
        @if (!["orders", "enquiries"].includes(kind())) {
          <button mat-flat-button (click)="edit()" [disabled]="working()">
            <mat-icon>add</mat-icon>Add
            {{ kind() === "allocations" ? "allocation" : "record" }}
          </button>
        }
      </div>
    </div>
    <div class="panel">
      <div class="admin-toolbar">
        <mat-icon>search</mat-icon
        ><input
          aria-label="Filter this page"
          placeholder="Filter this page…"
          [formControl]="search"
        /><span class="small muted">Page {{ page() }}</span>
      </div>
      @if (loading()) {
        <div class="loading"><mat-spinner diameter="28" />Loading…</div>
      } @else if (error()) {
        <div class="error-state" role="alert">{{ error() }}</div>
      } @else {
        <div class="table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                @for (col of keys(); track col) {
                  <th>
                    <button (click)="sortBy(col)">
                      {{ pretty(col) }}<mat-icon>unfold_more</mat-icon>
                    </button>
                  </th>
                }
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.id) {
                <tr>
                  @for (col of keys(); track col) {
                    <td [attr.data-label]="pretty(col)">
                      {{ display(row[col], col) }}
                    </td>
                  }
                  <td data-label="Actions" class="admin-actions">
                    @if (kind() === "orders") {
                      <button mat-button (click)="viewOrder(row)">View</button>
                      @for (action of orderActions(row); track action) {
                        <button
                          mat-button
                          [disabled]="working()"
                          (click)="orderAction(row, action)"
                        >
                          {{ action }}
                        </button>
                      }
                    } @else if (kind() === "allocations") {
                      <button
                        mat-button
                        [disabled]="
                          number(row['quantity']) <= number(row['reserved']) ||
                          working()
                        "
                        (click)="release(row)"
                      >
                        Return stock
                      </button>
                    } @else if (kind() === "enquiries") {
                      <button mat-button (click)="viewRecord(row)">Read</button
                      ><button
                        mat-button
                        [disabled]="working()"
                        (click)="enquiry(row)"
                      >
                        Set status
                      </button>
                    } @else {
                      <button
                        mat-button
                        [disabled]="working()"
                        (click)="edit(row)"
                      >
                        Edit
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="keys().length + 1">
                    <div class="empty">
                      <h3>No records to show.</h3>
                      <p>Create a record or try another page filter.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <div class="pagination">
        <button
          mat-button
          [disabled]="page() === 1 || loading()"
          (click)="changePage(-1)"
        >
          Previous</button
        ><span>{{ rows().length }} records on this page</span
        ><button
          mat-button
          [disabled]="!more() || loading()"
          (click)="changePage(1)"
        >
          Next
        </button>
      </div>
    </div>
  </section>`,
})
export class AdminListComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private destroy = inject(DestroyRef);
  kind = signal("products");
  label = computed(() => this.pretty(this.kind()));
  keys = computed(() => columns[this.kind()] || []);
  rows = signal<Row[]>([]);
  page = signal(1);
  more = signal(false);
  loading = signal(false);
  working = signal(false);
  error = signal("");
  search = new FormControl("", { nonNullable: true });
  query = signal("");
  sort = signal({ key: "", asc: true });
  filtered = computed(() => {
    const q = this.query().toLowerCase();
    const { key, asc } = this.sort();
    return this.rows()
      .filter((r) =>
        this.keys().some((k) =>
          this.display(r[k], k).toLowerCase().includes(q),
        ),
      )
      .sort((a, b) =>
        key
          ? (typeof a[key] === "number" && typeof b[key] === "number"
              ? (a[key] as number) - (b[key] as number)
              : String(a[key] ?? "").localeCompare(String(b[key] ?? ""))) *
            (asc ? 1 : -1)
          : 0,
      );
  });
  constructor() {
    this.search.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((q) => this.query.set(q));
    this.route.data.pipe(takeUntilDestroyed()).subscribe((d) => {
      this.kind.set(d["kind"]);
      this.page.set(1);
      this.search.reset();
      this.load();
    });
  }
  pretty(key: string) {
    return key.replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase());
  }
  number(v: unknown) {
    return Number(v);
  }
  display(v: unknown, key: string) {
    if (v == null) return "—";
    if (["published", "featured", "is_active"].includes(key))
      return v ? "Yes" : "No";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }
  load() {
    this.loading.set(true);
    this.error.set("");
    this.api
      .admin(this.kind(), this.page())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (p) => {
          this.rows.set(p.items);
          this.more.set(p.hasMore);
        },
        error: (e) => this.error.set(message(e)),
      });
  }
  changePage(n: number) {
    this.page.update((v) => v + n);
    this.load();
  }
  sortBy(key: string) {
    this.sort.update((s) => ({ key, asc: s.key === key ? !s.asc : true }));
  }
  orderActions(row: Row) {
    switch (row["status"]) {
      case "Pending":
        return ["Confirm", "Cancel"];
      case "Confirmed":
        return ["Ship", "Cancel"];
      case "Shipped":
        return ["Deliver"];
      default:
        return [];
    }
  }
  async dialogEdit(kind: string, row?: Row, action?: string) {
    this.working.set(true);
    try {
      const result = await firstValueFrom(
        this.dialog
          .open(EditorComponent, {
            width: "880px",
            maxWidth: "96vw",
            maxHeight: "94dvh",
            data: { kind, row, action },
          })
          .afterClosed(),
      );
      if (result) this.load();
    } finally {
      this.working.set(false);
    }
  }
  edit(row?: Row) {
    void this.dialogEdit(this.kind(), row);
  }
  release(row: Row) {
    void this.dialogEdit("release", row);
  }
  enquiry(row: Row) {
    void this.dialogEdit("enquiry-status", row);
  }
  orderAction(row: Row, action: string) {
    void this.dialogEdit("order-action", row, action);
  }
  viewRecord(row: Row) {
    this.dialog.open(RecordDialogComponent, {
      width: "800px",
      maxWidth: "96vw",
      data: row,
    });
  }
  viewOrder(row: Row) {
    this.api
      .adminOrder(row.id)
      .subscribe({
        next: (order) =>
          this.dialog.open(RecordDialogComponent, {
            width: "800px",
            maxWidth: "96vw",
            data: order,
          }),
        error: () => {},
      });
  }
}

@Component({
  selector: "app-record-dialog",
  imports: [MoneyPipe, ...UI],
  template: `<h2 mat-dialog-title>
      {{ order ? value(order, "reference") : "Enquiry details" }}
    </h2>
    <mat-dialog-content>
      @if (order) {
        <div class="detail-grid">
          @for (key of orderKeys; track key) {
            <div>
              <small class="muted">{{ label(key) }}</small>
              <p>{{ value(order, key) }}</p>
            </div>
          }
        </div>
        <h3>Order items</h3>
        <div class="table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items; track $index) {
                <tr>
                  <td>
                    {{ value(item, "product_name") }} ·
                    {{ value(item, "variant_label") }}
                  </td>
                  <td>{{ value(item, "quantity") }}</td>
                  <td>{{ number(item, "line_total") | money }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p>
          <strong>Order total: {{ number(order, "total") | money }}</strong> ·
          Delivery {{ number(order, "shipping") | money }}
        </p>
        <h3>Activity</h3>
        @for (event of events; track $index) {
          <p>
            <strong>{{ value(event, "event") }}</strong>
            <small class="muted">{{ value(event, "created_at") }} UTC</small
            ><br />{{ reason(event) }}
          </p>
        }
        @if (policies.length) {
          <details>
            <summary>Policies accepted at checkout</summary>
            @for (policy of policies; track $index) {
              <h4>{{ value(policy, "title") }}</h4>
              <p class="preserve-lines">{{ value(policy, "body") }}</p>
            }
          </details>
        }
      } @else {
        <div class="detail-grid">
          @for (key of enquiryKeys; track key) {
            @if (value(data, key) !== "—") {
              <div>
                <small class="muted">{{ label(key) }}</small>
                <p class="preserve-lines">{{ value(data, key) }}</p>
              </div>
            }
          }
        </div>
      }</mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close>Close</button></mat-dialog-actions
    >`,
})
export class RecordDialogComponent {
  data = inject(MAT_DIALOG_DATA) as Record<string, unknown>;
  order = (this.data["order"] || null) as Record<string, unknown> | null;
  items = (this.data["items"] || []) as Record<string, unknown>[];
  events = (this.data["events"] || []) as Record<string, unknown>[];
  orderKeys = [
    "name",
    "email",
    "phone",
    "address",
    "city",
    "postal_code",
    "country_code",
    "status",
    "payment_status",
    "created_at",
    "expires_at",
  ];
  enquiryKeys = [
    "name",
    "email",
    "type",
    "business",
    "country",
    "products",
    "quantity",
    "message",
    "status",
    "created_at",
  ];
  policies: Record<string, unknown>[] = [];
  constructor() {
    try {
      this.policies = JSON.parse(
        String(this.order?.["policy_snapshot"] || "[]"),
      ) as Record<string, unknown>[];
    } catch {}
  }
  value(row: Record<string, unknown>, key: string) {
    return String(row[key] ?? "—");
  }
  number(row: Record<string, unknown>, key: string) {
    return Number(row[key] || 0);
  }
  label(key: string) {
    return key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
  }
  reason(event: Record<string, unknown>) {
    try {
      return String(
        (JSON.parse(String(event["details"])) as Record<string, unknown>)[
          "reason"
        ] || "",
      );
    } catch {
      return "";
    }
  }
}
