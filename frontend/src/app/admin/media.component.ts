import { Component, inject, signal, OnDestroy } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MatDialog, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { finalize } from "rxjs";
import { ToastrService } from "ngx-toastr";
import { ApiService } from "../core/api.service";
import { Row } from "../core/models";
import { message } from "../core/interceptor";
import { UI } from "../shared/ui";
@Component({
  selector: "app-media",
  imports: [ReactiveFormsModule, ...UI],
  template: `<div class="section-heading">
      <div>
        <h2>Media library</h2>
        <p class="muted">
          JPEG/PNG, up to 5 MB. Private until linked to published content.
        </p>
      </div>
    </div>
    <div class="media-layout">
      <form class="panel" [formGroup]="form" (ngSubmit)="upload()">
        <h3>Upload an approved image</h3>
        <label class="file-label"
          >Image file<input
            type="file"
            accept="image/png,image/jpeg"
            (change)="select($event)" /></label
        ><mat-form-field appearance="outline"
          ><mat-label>Meaningful alt text</mat-label
          ><input matInput formControlName="alt" maxlength="250" /><mat-error
            >Describe the image.</mat-error
          ></mat-form-field
        ><mat-checkbox formControlName="rights"
          >I have permission to use this image.</mat-checkbox
        ><mat-checkbox formControlName="consent"
          >Required subject/guardian consent is confirmed.</mat-checkbox
        ><mat-checkbox formControlName="documentary"
          >This is a real documentary photograph, not generated
          imagery.</mat-checkbox
        >
        <p class="small muted">
          Programme, story, and event photographs require all three
          confirmations before publication. Do not upload sensitive personal
          records.
        </p>
        @if (error()) {
          <div class="error-state" role="alert">{{ error() }}</div>
        }
        <button mat-flat-button type="submit" [disabled]="busy()">
          {{ busy() ? "Uploading…" : "Upload image" }}
        </button>
      </form>
      <section class="panel">
        <h3>Uploaded images</h3>
        @for (row of rows(); track row.id) {
          <div class="media-row">
            <div>
              <strong>#{{ row.id }} · {{ row["alt_text"] }}</strong
              ><small
                >Rights:
                {{ row["rights_confirmed"] ? "confirmed" : "missing" }} ·
                Consent:
                {{ row["consent_confirmed"] ? "confirmed" : "missing" }} ·
                {{
                  row["is_documentary"] ? "Documentary" : "Illustrative"
                }}</small
              >
            </div>
            <button mat-button (click)="preview(row.id)">Preview</button>
          </div>
        } @empty {
          <p class="muted">No images uploaded yet.</p>
        }
        <div class="pagination">
          <button mat-button [disabled]="page() === 1" (click)="change(-1)">
            Previous</button
          ><span>Page {{ page() }}</span
          ><button mat-button [disabled]="!more()" (click)="change(1)">
            Next
          </button>
        </div>
      </section>
    </div>`,
})
export class MediaComponent {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastrService);
  form = new FormGroup({
    alt: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(250)],
    }),
    rights: new FormControl(false, {
      nonNullable: true,
      validators: Validators.requiredTrue,
    }),
    consent: new FormControl(false, { nonNullable: true }),
    documentary: new FormControl(false, { nonNullable: true }),
  });
  file: File | null = null;
  rows = signal<Row[]>([]);
  page = signal(1);
  more = signal(false);
  busy = signal(false);
  error = signal("");
  constructor() {
    this.load();
  }
  select(e: Event) {
    this.file = (e.target as HTMLInputElement).files?.[0] || null;
  }
  load() {
    this.api.admin("media", this.page()).subscribe({
      next: (p) => {
        this.rows.set(p.items);
        this.more.set(p.hasMore);
      },
      error: (e) => this.error.set(message(e)),
    });
  }
  change(n: number) {
    this.page.update((p) => p + n);
    this.load();
  }
  upload() {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.file) {
      this.error.set(
        "Select an image, provide alt text, and confirm usage rights.",
      );
      return;
    }
    if (
      this.file.size > 5 * 1024 * 1024 ||
      !["image/png", "image/jpeg"].includes(this.file.type)
    ) {
      this.error.set("Select a PNG or JPEG up to 5 MB.");
      return;
    }
    const v = this.form.getRawValue();
    const data = new FormData();
    data.append("file", this.file);
    data.append("alt", v.alt);
    data.append("rightsConfirmed", String(v.rights));
    data.append("consentConfirmed", String(v.consent));
    data.append("isDocumentary", String(v.documentary));
    this.busy.set(true);
    this.error.set("");
    this.api
      .upload(data)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.form.reset();
          this.file = null;
          this.toast.success("Image uploaded.");
          this.load();
        },
        error: (e) => this.error.set(message(e)),
      });
  }
  preview(id: number) {
    this.api
      .mediaPreview(id)
      .subscribe({
        next: (blob) =>
          this.dialog.open(MediaPreviewComponent, {
            data: URL.createObjectURL(blob),
            width: "900px",
            maxWidth: "96vw",
          }),
        error: () => {},
      });
  }
}
@Component({
  selector: "app-media-preview",
  imports: [...UI],
  template: `<h2 mat-dialog-title>Private image preview</h2>
    <mat-dialog-content
      ><img
        class="media-preview"
        [src]="url"
        alt="Uploaded image preview" /></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close>Close</button></mat-dialog-actions
    >`,
})
export class MediaPreviewComponent implements OnDestroy {
  url = inject<string>(MAT_DIALOG_DATA);
  ngOnDestroy() {
    URL.revokeObjectURL(this.url);
  }
}
