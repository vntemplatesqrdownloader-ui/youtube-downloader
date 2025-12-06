export default async function handler(req, res) {
  try {
    const { url, filename = "youtube-video.mp4" } = req.query;

    if (!url) {
      return res.status(400).json({ error: "Download URL required" });
    }

    console.log("🎥 Downloading from:", url);

    // Fetch video from the provided URL
    const videoResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!videoResponse.ok) {
      throw new Error("Failed to fetch video");
    }

    // Get content type
    const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
    
    // Set response headers
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"`
    );

    // Stream the video
    const buffer = Buffer.from(await videoResponse.arrayBuffer());
    res.send(buffer);

    console.log("✅ Download completed");

  } catch (err) {
    console.error("❌ Download Error:", err.message);
    res.status(500).json({ 
      error: "Download failed. Please try again." 
    });
  }
}