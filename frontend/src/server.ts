import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from "@angular/ssr/node";
import express from "express";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import https from "node:https";
const serverFolder = dirname(fileURLToPath(import.meta.url));
const browserFolder = resolve(serverFolder, "../browser");
const app = express();
const engine = new AngularNodeAppEngine({
  allowedHosts: process.env["PUBLIC_ORIGIN"]
    ? [new URL(process.env["PUBLIC_ORIGIN"]).hostname]
    : ["localhost", "127.0.0.1"],
});
const apiOrigin = new URL(
  process.env["SSR_API_ORIGIN"] || "https://localhost:7280",
);
if (!["https:", "http:"].includes(apiOrigin.protocol))
  throw new Error("Invalid API protocol");
if (
  apiOrigin.protocol === "http:" &&
  !["localhost", "127.0.0.1", "::1"].includes(apiOrigin.hostname)
)
  throw new Error("Remote API connections require HTTPS");
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/capi", (req, res) => {
  const target = new URL(req.originalUrl, apiOrigin);
  const transport = target.protocol === "https:" ? https : http;
  const headers: http.OutgoingHttpHeaders = {
    ...req.headers,
    host: target.host,
  };
  delete headers["x-forwarded-for"];
  delete headers["x-forwarded-host"];
  const upstream = transport.request(
    target,
    { method: req.method, headers },
    (response) => {
      res.status(response.statusCode || 502);
      for (const [name, value] of Object.entries(response.headers))
        if (
          value !== undefined &&
          !["connection", "transfer-encoding"].includes(name)
        )
          res.setHeader(name, value);
      response.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent)
      res
        .status(502)
        .json({
          detail:
            "The store is temporarily unavailable. Please try again shortly.",
        });
    else res.end();
  });
  req.on("aborted", () => upstream.destroy());
  req.pipe(upstream);
});
app.get("/robots.txt", (_req, res) =>
  res
    .type("text/plain")
    .send(
      "User-agent: *\nAllow: /\nDisallow: /staff/\nDisallow: /checkout\nDisallow: /cart\nDisallow: /track\nDisallow: /order-confirmation\n" +
        (process.env["PUBLIC_ORIGIN"]
          ? "Sitemap: " + process.env["PUBLIC_ORIGIN"] + "/sitemap.xml\n"
          : ""),
    ),
);
app.get("/sitemap.xml", async (_req, res) => {
  try {
    const response = await fetch(new URL("/capi/sitemap", apiOrigin));
    res
      .status(response.status)
      .type("application/xml")
      .send(await response.text());
  } catch {
    res.status(503).send("Sitemap temporarily unavailable");
  }
});
app.use(
  express.static(browserFolder, {
    maxAge: "1y",
    index: false,
    redirect: false,
  }),
);
app.use((req, res, next) => {
  engine
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});
if (isMainModule(import.meta.url)) {
  const port = process.env["PORT"] || 4000;
  app.listen(port, () => console.log("Nutragea SSR listening on port " + port));
}
export const reqHandler = createNodeRequestHandler(app);
