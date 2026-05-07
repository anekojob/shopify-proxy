module.exports = async (req, res) => {
  const shopifyDomain = "jobs24u.jobavasar.com";

  // ✅ Domain → Ad config
  const domainAds = {
    "jobteam2.onlinejobhelp.com": {
      injectAd: `
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5953224202278307" crossorigin="anonymous"></script>
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="ca-pub-5953224202278307"
             data-ad-slot="8815362625"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
      `,
      replaceSlot: "8815362625",
    },
    "jobteam1.jobworld.info": {
      injectAd: `
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5953224202278307" crossorigin="anonymous"></script>
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="ca-pub-5953224202278307"
             data-ad-slot="7699529023"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
      `,
      replaceSlot: "7699529023",
    },
    "jobteam6.car-kendra.com": {
      injectAd: `
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5953224202278307" crossorigin="anonymous"></script>
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="ca-pub-5953224202278307"
             data-ad-slot="8600656503"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
      `,
      replaceSlot: "8600656503",
    },
  };

  if (req.url.includes("cdn.shopify.com")) {
    res.redirect(301, `https://cdn.shopify.com${req.url}`);
    return;
  }

  const targetURL = `https://${shopifyDomain}${req.url}`;

  try {
    const response = await fetch(targetURL, {
      method: req.method,
      headers: {
        ...req.headers,
        host: shopifyDomain,
        "X-Forwarded-Host": req.headers.host,
        "X-Forwarded-Proto": "https",
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : null,
      redirect: "manual",
    });

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location && location.includes(shopifyDomain)) {
        const newLocation = location.replace(
          `https://${shopifyDomain}`,
          `https://${req.headers.host}`
        );
        res.setHeader("location", newLocation);
        res.status(response.status).end();
        return;
      }
    }

    // Copy all headers
    response.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding"].includes(key)) {
        res.setHeader(key, value);
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // ✅ HTML rewrite + ad injection
    if (contentType.includes("text/html")) {
      let body = await response.text();

      // Replace Shopify domain with current host
      body = body
        .split(`https://${shopifyDomain}`)
        .join(`https://${req.headers.host}`);
      body = body
        .split(`http://${shopifyDomain}`)
        .join(`https://${req.headers.host}`);

      // ✅ Per-domain ad replacement + injection
      const currentHost = req.headers.host;
      const adConfig = domainAds[currentHost];

      if (adConfig) {
        // Replace original Shopify ad slot with this domain's slot
        body = body.split("8411859591").join(adConfig.replaceSlot);

        // Inject ad before </body>
        body = body.replace("</body>", `${adConfig.injectAd}</body>`);
      }

      res.setHeader("content-type", "text/html; charset=utf-8");
      res.status(response.status).send(body);
      return;
    }

    // ✅ CSS rewrite
    if (contentType.includes("text/css")) {
      let body = await response.text();
      body = body
        .split(`https://${shopifyDomain}`)
        .join(`https://${req.headers.host}`);
      res.setHeader("content-type", "text/css");
      res.status(response.status).send(body);
      return;
    }

    // ✅ Sitemap & XML rewrite
    if (req.url.includes("sitemap") || contentType.includes("xml")) {
      let body = await response.text();
      body = body
        .split(`https://${shopifyDomain}`)
        .join(`https://${req.headers.host}`);
      body = body
        .split(`http://${shopifyDomain}`)
        .join(`https://${req.headers.host}`);
      res.setHeader("content-type", "application/xml; charset=utf-8");
      res.status(response.status).send(body);
      return;
    }

    // All other files pass through
    const buffer = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).send("Proxy error: " + error.message);
  }
};
