module.exports = async (req, res) => {
  const shopifyDomain = "jobs24u.jobavasar.com"; // Your Shopify primary domain
  const targetURL = `https://${shopifyDomain}${req.url}`;

  try {
    const response = await fetch(targetURL, {
      method: req.method,
      headers: {
        ...req.headers,
        host: shopifyDomain,
        "X-Forwarded-Host": req.headers.host,
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : null,
      redirect: "manual", // Block Shopify redirect
    });

    // If Shopify tries to redirect — rewrite it
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location && location.includes(shopifyDomain)) {
        const newLocation = location.replace(shopifyDomain, req.headers.host);
        res.setHeader("location", newLocation);
        res.status(response.status).end();
        return;
      }
    }

    // Rewrite domain in HTML content
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      let body = await response.text();
      body = body.split(shopifyDomain).join(req.headers.host);
      res.setHeader("content-type", "text/html");
      res.status(response.status).send(body);
      return;
    }

    // All other responses pass through directly
    const buffer = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    res.status(500).send("Proxy error: " + error.message);
  }
};
