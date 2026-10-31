import { describe, it, expect } from "vitest";
import { parseCart } from "./cart.service";
describe("persistent cart boundary", () => {
  it("recovers safely from malformed storage", () => {
    expect(parseCart("{bad")).toEqual([]);
    expect(parseCart('{"variantId":1}')).toEqual([]);
  });
  it("rejects invalid quantities and deduplicates variants", () => {
    expect(
      parseCart(
        JSON.stringify([
          { variantId: 1, quantity: 2 },
          { variantId: 1, quantity: 99 },
          { variantId: 2, quantity: -1 },
          { variantId: 3, quantity: 1.5 },
          { variantId: 4, quantity: 101 },
          { variantId: 0, quantity: 1 },
        ]),
      ),
    ).toEqual([{ variantId: 1, quantity: 2 }]);
  });
  it("never carries prices or customer details into persisted lines", () => {
    expect(
      parseCart(
        '[{"variantId":4,"quantity":2,"price":1,"email":"secret@example.invalid","accessCode":"secret"}]',
      ),
    ).toEqual([{ variantId: 4, quantity: 2 }]);
  });
  it("limits persisted cart size", () =>
    expect(
      parseCart(
        JSON.stringify(
          Array.from({ length: 40 }, (_, i) => ({
            variantId: i + 1,
            quantity: 1,
          })),
        ),
      ),
    ).toHaveLength(30));
});
