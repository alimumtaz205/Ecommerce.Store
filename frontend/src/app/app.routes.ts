import { Routes, CanActivateFn, Router } from "@angular/router";
import { inject } from "@angular/core";
import { AuthService } from "./core/auth.service";
export const staffGuard: CanActivateFn = () =>
  inject(AuthService).user()?.role === "Admin" ||
  inject(Router).createUrlTree(["/staff/login"]);
export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./features/home.component").then((m) => m.HomeComponent),
  },
  {
    path: "shop",
    loadComponent: () =>
      import("./features/shop.component").then((m) => m.ShopComponent),
  },
  {
    path: "shop/:slug",
    loadComponent: () =>
      import("./features/product.component").then((m) => m.ProductComponent),
  },
  {
    path: "about",
    loadComponent: () =>
      import("./features/content.component").then((m) => m.AboutComponent),
  },
  {
    path: "impact",
    data: { type: "Programme" },
    loadComponent: () =>
      import("./features/content.component").then(
        (m) => m.ContentListComponent,
      ),
  },
  {
    path: "impact/:slug",
    loadComponent: () =>
      import("./features/content.component").then(
        (m) => m.ContentDetailComponent,
      ),
  },
  {
    path: "stories",
    loadComponent: () =>
      import("./features/content.component").then(
        (m) => m.ContentListComponent,
      ),
  },
  {
    path: "stories/:slug",
    loadComponent: () =>
      import("./features/content.component").then(
        (m) => m.ContentDetailComponent,
      ),
  },
  {
    path: "pages/:slug",
    loadComponent: () =>
      import("./features/content.component").then(
        (m) => m.ContentDetailComponent,
      ),
  },
  {
    path: "wholesale",
    data: { wholesale: true },
    loadComponent: () =>
      import("./features/enquiry.component").then((m) => m.EnquiryComponent),
  },
  {
    path: "contact",
    loadComponent: () =>
      import("./features/enquiry.component").then((m) => m.EnquiryComponent),
  },
  {
    path: "cart",
    loadComponent: () =>
      import("./features/cart.component").then((m) => m.CartComponent),
  },
  {
    path: "checkout",
    loadComponent: () =>
      import("./features/checkout.component").then((m) => m.CheckoutComponent),
  },
  {
    path: "order-confirmation",
    loadComponent: () =>
      import("./features/order.component").then((m) => m.ConfirmationComponent),
  },
  {
    path: "track",
    loadComponent: () =>
      import("./features/order.component").then((m) => m.TrackComponent),
  },
  {
    path: "staff/login",
    loadComponent: () =>
      import("./admin/admin.component").then((m) => m.StaffLoginComponent),
  },
  {
    path: "staff",
    canActivate: [staffGuard],
    loadComponent: () =>
      import("./admin/admin.component").then((m) => m.StaffShellComponent),
    children: [
      ...[
        "products",
        "variants",
        "categories",
        "allocations",
        "orders",
        "content",
        "shipping",
        "enquiries",
      ].map((kind) => ({
        path: kind,
        data: { kind },
        loadComponent: () =>
          import("./admin/admin.component").then((m) => m.AdminListComponent),
      })),
      {
        path: "media",
        loadComponent: () =>
          import("./admin/media.component").then((m) => m.MediaComponent),
      },
      {
        path: "settings",
        loadComponent: () =>
          import("./admin/settings.component").then((m) => m.SettingsComponent),
      },
      { path: "", pathMatch: "full", redirectTo: "products" },
    ],
  },
  {
    path: "**",
    loadComponent: () =>
      import("./features/not-found.component").then((m) => m.NotFoundComponent),
  },
];
