import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Product } from "../core/models";
import { MoneyPipe } from "./money.pipe";
import { UI } from "./ui";
@Component({
  selector: "app-product-card",
  imports: [RouterLink, MoneyPipe, ...UI],
  template: `<article class="product-card">
    <a class="product-photo" [routerLink]="['/shop', product().slug]">
      @if (product().images[0]) {
        <img
          [src]="product().images[0].url"
          [alt]="product().images[0].alt"
          width="600"
          height="600"
          loading="lazy"
        />
      } @else {
        <span class="image-empty"
          ><mat-icon>eco</mat-icon>Image unavailable</span
        >
      }
      <span class="product-category">{{ product().category_name }}</span></a
    >
    <div class="product-card-copy">
      <span class="overline">{{ product().origin }}</span>
      <h3>
        <a [routerLink]="['/shop', product().slug]">{{ product().name }}</a>
      </h3>
      <p>{{ product().summary }}</p>
      <div class="product-card-bottom">
        <strong>
          @if (product().min_price !== null) {
            <small>From </small>{{ product().min_price | money }}
          } @else {
            View details
          }</strong
        ><a
          mat-icon-button
          [routerLink]="['/shop', product().slug]"
          [attr.aria-label]="'View ' + product().name"
          ><mat-icon>arrow_forward</mat-icon></a
        >
      </div>
    </div>
  </article>`,
})
export class ProductCardComponent {
  product = input.required<Product>();
}
