import axios from "axios";

// -----------------------------
// GLOBAL INDEX FOR ROUND-ROBIN
// -----------------------------
let apiIndex = 0;

export default async function handler(req, res) {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "YouTube URL required" });
    }

    const videoId = extractVideoId(url);

    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    // -----------------------------
    // 10 RapidAPI keys Round-Robin
    // -----------------------------
    const API_KEYS = [
      process.env.RAPID_KEY_1,
      process.env.RAPID_KEY_2,
      process.env.RAPID_KEY_3,
      process.env.RAPID_KEY_4,
      process.env.RAPID_KEY_5,
      process.env.RAPID_KEY_6,
      process.env.RAPID_KEY_7,
      process.env.RAPID_KEY_8,
      process.env.RAPID_KEY_9,
      process.env.RAPID_KEY_10
    ].filter(Boolean);

    if (API_KEYS.length === 0) {
      return res.status(400).json({ error: "No API keys found!" });
    }

    let finalResponse = null;

    // Try 10 keys one-by-one until success
    for (let i = 0; i < API_KEYS.length; i++) {
      // Pick key using rotation
      const key = API_KEYS[apiIndex];

      console.log(`🔄 Using API KEY #${apiIndex + 1}`);

      // Move index forward (Round Robin)
      apiIndex = (apiIndex + 1) % API_KEYS.length;

      try {
        const response = await axios.get(
          `https://youtube-media-downloader.p.rapidapi.com/v2/video/details`,
          {
            params: { videoId },
            headers: {
              "x-rapidapi-key": key,
              "x-rapidapi-host": "youtube-media-downloader.p.rapidapi.com"
            }
          }
        );

        finalResponse = response.data;
        console.log(`✅ Success with KEY #${i + 1}`);
        break;
      } catch (err) {
        console.log(`❌ Failed with KEY #${i + 1}`);
      }
    }

    if (!finalResponse) {
      return res.status(500).json({
        error: "All API keys failed. Try later."
      });
    }

    const data = finalResponse;

    if (!data || !data.title) {
      return res.status(400).json({
        error: "Unable to fetch video information"
      });
    }

    const videos = data.videos?.items || [];
    const audios = data.audios?.items || [];

    const qualities = videos
      .filter(v => v.url)
      .map(v => ({
        quality: v.quality || "Unknown",
        url: v.url,
        filesize: v.sizeText || "Unknown size",
        type: "video"
      }));

    const audioQualities = audios
      .filter(a => a.url)
      .map(a => ({
        quality: `Audio ${a.quality || ""}`,
        url: a.url,
        filesize: a.sizeText || "Unknown size",
        type: "audio"
      }));

    return res.status(200).json({
      status: "success",
      data: {
        title: data.title,
        author: data.channel?.name || "Unknown",
        thumbnail: data.thumbnails?.[0]?.url ||
          `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: parseInt(data.lengthSeconds) || 0,
        views: parseInt(data.viewCount) || 0,
        uploadDate: data.publishDate || "",
        description: data.description || "",
        qualities: [...qualities, ...audioQualities],
        videoId,
        videoUrl: url
      }
    });

  } catch (error) {
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}

// Extract YouTube ID
function extractVideoId(url) {
  const cleanUrl = url.split('&')[0];

  const patterns = [
    /watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (let pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}
