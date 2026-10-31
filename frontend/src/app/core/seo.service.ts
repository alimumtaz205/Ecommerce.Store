import { inject, Injectable } from "@angular/core";
import { Title, Meta } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";
import { environment } from "../../environments/environment";
@Injectable({ providedIn: "root" })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);
  set(title: string, description: string, path: string, image?: string) {
    this.title.setTitle(title + " · Nutragea");
    for (const [name, content] of Object.entries({
      description,
      "og:title": title + " · Nutragea",
      "og:description": description,
      "og:type": "website",
      "og:url": new URL(path, environment.siteUrl).href,
    })) {
      this.meta.updateTag(
        name.startsWith("og:")
          ? { property: name, content }
          : { name, content },
      );
    }
    if (image)
      this.meta.updateTag({
        property: "og:image",
        content: new URL(image, environment.siteUrl).href,
      });
    else this.meta.removeTag('property="og:image"');
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement("link");
      link.rel = "canonical";
      this.doc.head.appendChild(link);
    }
    link.href = new URL(path, environment.siteUrl).href;
    this.doc.getElementById("structured-data")?.remove();
  }
  structured(data: Record<string, unknown>) {
    this.doc.getElementById("structured-data")?.remove();
    const s = this.doc.createElement("script");
    s.id = "structured-data";
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
    this.doc.head.appendChild(s);
  }
}
