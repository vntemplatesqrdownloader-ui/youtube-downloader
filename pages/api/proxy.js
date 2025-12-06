export default async function handler(req, res) {
  try {
    const { url, filename } = req.query;

    if (!url) {
      return res.status(400).json({ error: "URL required" });
    }

    // Send streaming request
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(400).json({ error: "Unable to download media" });
    }

    // Pass headers correctly
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename || "video.mp4"}"`
    );

    // STREAM the video instead of buffering
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }

    res.end();
  } catch (err) {
    console.error("PROXY ERROR:", err.message);
    res.status(500).json({ error: "Proxy server error" });
  }
}
