import { Pipe, PipeTransform } from "@angular/core";
@Pipe({ name: "money", standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency = "PKR") {
    return value == null
      ? "Price unavailable"
      : new Intl.NumberFormat("en-PK", {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(value);
  }
}
