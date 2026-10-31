import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { SeoService } from "../core/seo.service";
import { UI } from "../shared/ui";
@Component({
  selector: "app-not-found",
  imports: [RouterLink, ...UI],
  template: `<div class="wrap page empty">
    <span class="overline">404 · PAGE NOT FOUND</span>
    <h1>A different path awaits.</h1>
    <p>This address does not lead to a published page.</p>
    <a mat-flat-button routerLink="/">Back to Nutragea</a>
  </div>`,
})
export class NotFoundComponent {
  constructor() {
    inject(SeoService).set(
      "Page not found",
      "This page could not be found.",
      "/",
    );
  }
}
