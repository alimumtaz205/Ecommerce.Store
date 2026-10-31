import {
  afterNextRender,
  DestroyRef,
  inject,
  Injectable,
  signal,
  computed,
} from "@angular/core";
import { CartLine } from "./models";
export const CART_KEY = "nutragea-cart-v1";
export function parseCart(raw: string | null): CartLine[] {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(value)) return [];
    const ids = new Set<number>();
    return value
      .filter((x): x is CartLine => {
        if (!x || typeof x !== "object") return false;
        const row = x as CartLine;
        if (
          !Number.isSafeInteger(row.variantId) ||
          row.variantId < 1 ||
          !Number.isInteger(row.quantity) ||
          row.quantity < 1 ||
          row.quantity > 100 ||
          ids.has(row.variantId)
        )
          return false;
        ids.add(row.variantId);
        return true;
      })
      .slice(0, 30)
      .map((x) => ({ variantId: x.variantId, quantity: x.quantity }));
  } catch {
    return [];
  }
}
@Injectable({ providedIn: "root" })
export class CartService {
  lines = signal<CartLine[]>([]);
  count = computed(() => this.lines().reduce((n, x) => n + x.quantity, 0));
  storageNotice = signal("");
  private ready = false;
  private destroy = inject(DestroyRef);
  constructor() {
    afterNextRender(() => {
      this.ready = true;
      try {
        this.lines.set(parseCart(localStorage.getItem(CART_KEY)));
      } catch {
        this.storageNotice.set(
          "Your browser cannot save this cart between visits.",
        );
      }
      const sync = (event: StorageEvent) => {
        if (event.key === CART_KEY) this.lines.set(parseCart(event.newValue));
      };
      window.addEventListener("storage", sync);
      this.destroy.onDestroy(() => window.removeEventListener("storage", sync));
    });
  }
  add(variantId: number, quantity: number) {
    const old = this.lines().find((x) => x.variantId === variantId);
    this.set(variantId, Math.min(100, (old?.quantity || 0) + quantity));
  }
  set(variantId: number, quantity: number) {
    if (
      !Number.isSafeInteger(variantId) ||
      variantId < 1 ||
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > 100
    )
      return;
    const lines = this.lines().filter((x) => x.variantId !== variantId);
    if (quantity > 0) lines.push({ variantId, quantity });
    if (lines.length > 30) return;
    this.lines.set(lines);
    this.persist();
  }
  clear() {
    this.lines.set([]);
    this.persist();
  }
  private persist() {
    if (this.ready)
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(this.lines()));
      } catch {
        this.storageNotice.set("Your cart cannot be saved between visits.");
      }
  }
}
