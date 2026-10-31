import { Component, inject, signal } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { firstValueFrom } from "rxjs";
import { ApiService } from "../core/api.service";
import { Row } from "../core/models";
import { message } from "../core/interceptor";
import { EditorComponent } from "./editor.component";
import { UI } from "../shared/ui";
@Component({
  selector: "app-settings",
  imports: [...UI],
  template: `<div class="section-heading">
      <div>
        <h2>Store settings</h2>
        <p class="muted">
          Configure your real business details before opening checkout.
        </p>
      </div>
      <button mat-flat-button [disabled]="!data()" (click)="edit()">
        Edit settings
      </button>
    </div>
    @if (error()) {
      <div class="error-state" role="alert">{{ error() }}</div>
    }
    @if (data()) {
      <section class="panel">
        <dl class="facts">
          @for (item of items(); track item[0]) {
            <div>
              <dt>{{ item[0] }}</dt>
              <dd>{{ item[1] }}</dd>
            </div>
          }
        </dl>
        <div class="notice">
          Checkout opens only when COD, approved shipping, all four published
          policies, and business contact details are present. This application
          does not enable online card payments.
        </div>
      </section>
    }`,
})
export class SettingsComponent {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  data = signal<Row | null>(null);
  error = signal("");
  items = signal<[string, string][]>([]);
  constructor() {
    this.load();
  }
  load() {
    this.api.adminSettings().subscribe({
      next: (r) => {
        this.data.set(r);
        this.items.set(
          Object.entries(r)
            .filter(([k]) => k !== "id" && k !== "version")
            .map(([k, v]) => [
              k.replaceAll("_", " "),
              typeof v === "boolean"
                ? v
                  ? "Yes"
                  : "No"
                : String(v ?? "Not configured"),
            ]),
        );
      },
      error: (e) => this.error.set(message(e)),
    });
  }
  async edit() {
    if (
      await firstValueFrom(
        this.dialog
          .open(EditorComponent, {
            width: "800px",
            maxWidth: "96vw",
            data: { kind: "settings", row: this.data() },
          })
          .afterClosed(),
      )
    )
      this.load();
  }
}
