import React, { useState, useEffect } from "react";
import {
  Download,
  Youtube,
  History,
  Settings,
  Home,
  Loader2,
  Search,
  Video,
  Music,
  AlertCircle,
  X,
  Trash2,
  Moon,
  Sun,
  CheckCircle,
  Play,
  Eye,
  Clock,
} from "lucide-react";

/* -------------------------------------------------------
    STORAGE HOOKS
------------------------------------------------------- */
const useDownloadHistory = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("yt_download_history");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const addToHistory = (item) => {
    const entry = { ...item, id: Date.now(), timestamp: Date.now() };
    const updated = [entry, ...history];
    setHistory(updated);
    localStorage.setItem("yt_download_history", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("yt_download_history");
  };

  const removeItem = (id) => {
    const updated = history.filter((i) => i.id !== id);
    setHistory(updated);
    localStorage.setItem("yt_download_history", JSON.stringify(updated));
  };

  return { history, addToHistory, clearHistory, removeItem };
};

const useSettings = () => {
  const [settings, setSettings] = useState({
    theme: "light",
    defaultQuality: "720p",
    autoDownload: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("yt_app_settings");
      if (saved) setSettings(JSON.parse(saved));
    } catch {}
  }, []);

  const updateSettings = (obj) => {
    const updated = { ...settings, ...obj };
    setSettings(updated);
    localStorage.setItem("yt_app_settings", JSON.stringify(updated));
  };

  return { settings, updateSettings };
};

/* -------------------------------------------------------
    MAIN APP
------------------------------------------------------- */
export default function YouTubeDownloaderApp() {
  const [currentPage, setCurrentPage] = useState("home");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [selectedQuality, setSelectedQuality] = useState("");

  const { history, addToHistory, clearHistory, removeItem } =
    useDownloadHistory();
  const { settings, updateSettings } = useSettings();

  /* -------------------------------------------------------
      FETCH VIDEO DETAILS
  ------------------------------------------------------- */
  const fetchVideoInfo = async () => {
    setError("");
    setResult(null);

    if (!url.trim()) {
      setError("Please paste YouTube URL");
      return;
    }

    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      setError("Invalid YouTube URL");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/youtube?url=${encodeURIComponent(url)}`
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to fetch video");

      setResult(data.data);

      if (data.data.qualities?.length > 0) {
        setSelectedQuality(data.data.qualities[0].quality);
      }

      setCurrentPage("download");
    } catch (err) {
      setError(err.message || "Failed to fetch video info");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------
      DOWNLOAD HANDLER
  ------------------------------------------------------- */
  const handleDownload = async () => {
    if (!result) return;

    const selected = result.qualities?.find(
      (q) => q.quality === selectedQuality
    );

    const downloadUrl = selected?.url;

    if (!downloadUrl) {
      setError("Download URL not available for this quality.");
      return;
    }

    // Save history
    addToHistory({
      title: result.title,
      author: result.author,
      thumbnail: result.thumbnail,
      quality: selectedQuality,
      url: result.videoUrl,
    });

    // Clean filename
    const cleanTitle = result.title
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 40);

    const ext = selectedQuality.toLowerCase().includes("audio")
      ? "mp3"
      : "mp4";

    const fileName = `${cleanTitle}.${ext}`;

    try {
      setError("");
      setLoading(true);

      // Use backend proxy to download
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: downloadUrl,
          filename: fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      window.URL.revokeObjectURL(blobUrl);

    } catch (err) {
      setError("Download failed. Please try again.");
      console.error("Download error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------
      PAGE RENDERING
  ------------------------------------------------------- */
  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={setCurrentPage} settings={settings} />;
      case "download":
        return (
          <DownloadPage
            url={url}
            setUrl={setUrl}
            loading={loading}
            result={result}
            error={error}
            selectedQuality={selectedQuality}
            setSelectedQuality={setSelectedQuality}
            onFetch={fetchVideoInfo}
            onDownload={handleDownload}
            settings={settings}
          />
        );
      case "history":
        return (
          <HistoryPage
            history={history}
            onClear={clearHistory}
            onRemove={removeItem}
            settings={settings}
          />
        );
      case "settings":
        return (
          <SettingsPage settings={settings} onUpdate={updateSettings} />
        );
      default:
        return <HomePage onNavigate={setCurrentPage} settings={settings} />;
    }
  };

  /* -------------------------------------------------------
      MAIN UI WRAPPER
  ------------------------------------------------------- */
  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        settings.theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50"
      }`}
    >
      {/* HEADER */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-lg border-b ${
          settings.theme === "dark"
            ? "bg-gray-800/80 border-gray-700"
            : "bg-white/80 border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-600 to-red-500 p-2 rounded-xl">
            <Youtube className="w-6 h-6 text-white" />
          </div>
          <h1
            className={`text-xl font-bold ${
              settings.theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            YT Downloader Pro
          </h1>
        </div>
      </header>

      {/* MAIN SECTION */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderPage()}
      </main>

      {/* BOTTOM NAV */}
      <nav
        className={`fixed bottom-0 left-0 right-0 backdrop-blur-lg border-t px-4 py-3 ${
          settings.theme === "dark"
            ? "bg-gray-800/95 border-gray-700"
            : "bg-white/95 border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-around items-center">
          <NavButton
            icon={Home}
            label="Home"
            active={currentPage === "home"}
            onClick={() => setCurrentPage("home")}
            theme={settings.theme}
          />
          <NavButton
            icon={Download}
            label="Download"
            active={currentPage === "download"}
            onClick={() => setCurrentPage("download")}
            theme={settings.theme}
          />
          <NavButton
            icon={History}
            label="History"
            active={currentPage === "history"}
            onClick={() => setCurrentPage("history")}
            theme={settings.theme}
          />
          <NavButton
            icon={Settings}
            label="Settings"
            active={currentPage === "settings"}
            onClick={() => setCurrentPage("settings")}
            theme={settings.theme}
          />
        </div>
      </nav>
    </div>
  );
}

/* -------------------------------------------------------
    NAV BUTTON
------------------------------------------------------- */
function NavButton({ icon: Icon, label, active, onClick, theme }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
        active
          ? theme === "dark"
            ? "bg-red-600 text-white"
            : "bg-gradient-to-br from-red-600 to-red-500 text-white shadow-lg"
          : theme === "dark"
          ? "text-gray-400 hover:text-white"
          : "text-gray-500 hover:text-gray-900"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------
    HOME PAGE
------------------------------------------------------- */
function HomePage({ onNavigate, settings }) {
  const features = [
    {
      icon: Video,
      title: "Video Download",
      desc: "Download videos in HD quality",
      action: "download",
    },
    {
      icon: Music,
      title: "Audio Extract",
      desc: "Extract MP3 audio from videos",
      action: "download",
    },
    {
      icon: Download,
      title: "Multiple Formats",
      desc: "720p, 1080p, MP3",
      action: "download",
    },
  ];

  return (
    <div className="space-y-8 pb-24">
      {/* HERO */}
      <div
        className={`rounded-3xl p-8 text-center border ${
          settings.theme === "dark"
            ? "bg-gradient-to-br from-red-900/40 to-orange-900/40 border-red-700"
            : "bg-gradient-to-br from-red-100 to-orange-100 border-red-200"
        }`}
      >
        <div className="inline-block bg-gradient-to-br from-red-600 to-red-500 p-4 rounded-2xl mb-4">
          <Youtube className="w-12 h-12 text-white" />
        </div>

        <h2
          className={`text-3xl font-bold ${
            settings.theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          Download YouTube Videos
        </h2>

        <p
          className={`mt-2 ${
            settings.theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Fast, free & HD downloads — No proxy required.
        </p>

        <button
          onClick={() => onNavigate("download")}
          className="mt-6 bg-gradient-to-r from-red-600 to-red-500 text-white px-10 py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg"
        >
          Start Downloading
        </button>
      </div>

      {/* FEATURES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <button
            key={i}
            onClick={() => onNavigate(f.action)}
            className={`p-6 rounded-2xl border backdrop-blur-lg hover:shadow-xl transition hover:scale-105 ${
              settings.theme === "dark"
                ? "bg-gray-800/40 border-gray-700"
                : "bg-white/80 border-gray-200"
            }`}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-500 rounded-xl flex items-center justify-center mb-4">
              <f.icon className="w-6 h-6 text-white" />
            </div>
            <h3
              className={`font-bold text-lg ${
                settings.theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {f.title}
            </h3>
            <p
              className={`text-sm mt-1 ${
                settings.theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {f.desc}
            </p>
          </button>
        ))}
      </div>

      {/* HOW IT WORKS */}
      <div
        className={`p-6 rounded-2xl border backdrop-blur-lg ${
          settings.theme === "dark"
            ? "bg-gray-800/40 border-gray-700"
            : "bg-white/80 border-gray-200"
        }`}
      >
        <h3
          className={`text-xl font-bold mb-4 ${
            settings.theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          How It Works
        </h3>

        <div className="space-y-3">
          <Step number="1" text="Copy YouTube video URL" theme={settings.theme} />
          <Step number="2" text="Paste URL and fetch video info" theme={settings.theme} />
          <Step number="3" text="Choose quality and download instantly" theme={settings.theme} />
        </div>
      </div>
    </div>
  );
}

function Step({ number, text, theme }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
        {number}
      </div>
      <p className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
        {text}
      </p>
    </div>
  );
}

/* -------------------------------------------------------
    DOWNLOAD PAGE
------------------------------------------------------- */
function DownloadPage({
  url,
  setUrl,
  loading,
  result,
  error,
  selectedQuality,
  setSelectedQuality,
  onFetch,
  onDownload,
  settings,
}) {
  // Format Duration (MM:SS)
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format Views
  const formatViews = (views) => {
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
    return views;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Input Card */}
      <div
        className={`rounded-2xl p-6 border backdrop-blur-lg shadow-lg ${
          settings.theme === "dark"
            ? "bg-gray-800/50 border-gray-700"
            : "bg-white/70 border-gray-200"
        }`}
      >
        <h2
          className={`text-2xl font-bold mb-4 ${
            settings.theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          Download YouTube Video
        </h2>

        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <label
              className={`block text-sm font-semibold mb-2 ${
                settings.theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              YouTube URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-red-500 ${
                settings.theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>

          {/* FETCH BUTTON */}
          <button
            onClick={onFetch}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Fetch Video
              </>
            )}
          </button>
        </div>
      </div>

      {/* ERROR BOX */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-1" />
          <div>
            <h4 className="font-semibold text-red-900">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* LOADING SKELETON */}
      {loading && (
        <div
          className={`rounded-2xl p-6 border backdrop-blur-lg ${
            settings.theme === "dark"
              ? "bg-gray-800/50 border-gray-700"
              : "bg-white/70 border-gray-200"
          }`}
        >
          <div className="space-y-3">
            <div className="h-48 bg-gray-200 animate-pulse rounded-xl" />
            <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
            <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
          </div>
        </div>
      )}

      {/* RESULT PREVIEW */}
      {result && !loading && (
        <div
          className={`rounded-2xl p-6 border backdrop-blur-lg shadow-lg space-y-5 ${
            settings.theme === "dark"
              ? "bg-gray-800/50 border-gray-700"
              : "bg-white/70 border-gray-200"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3
              className={`text-xl font-bold ${
                settings.theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Video Ready!
            </h3>
            <div className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1 font-semibold">
              <CheckCircle className="w-4 h-4" />
              READY
            </div>
          </div>

          {/* Thumbnail */}
          <div className="relative rounded-xl overflow-hidden shadow-md">
            <img
              src={result.thumbnail}
              alt={result.title}
              className="w-full rounded-xl"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Play className="w-16 h-16 text-white opacity-80" />
            </div>
          </div>

          {/* Meta Info */}
          <div>
            <h4
              className={`text-lg font-bold ${
                settings.theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {result.title}
            </h4>
            <p
              className={`text-sm mb-2 ${
                settings.theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {result.author}
            </p>

            <div className="flex gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {formatViews(result.views)} views
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(result.duration)}
              </span>
            </div>
          </div>

          {/* QUALITY SELECTOR */}
          <div className="mt-4">
            <label
              className={`block text-sm font-semibold mb-2 ${
                settings.theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Select Quality
            </label>

            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none ${
                settings.theme === "dark"
                  ? "bg-gray-700 text-white border-gray-600"
                  : "bg-white border-gray-300"
              }`}
            >
              {result.qualities.map((q, i) => (
                <option key={i} value={q.quality}>
                  {q.quality} — {q.filesize || "size unknown"}
                  {q.type === "audio" ? " (Audio)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* DOWNLOAD BUTTON */}
          <button
            onClick={onDownload}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition text-lg flex items-center justify-center gap-2"
          >
            <Download className="w-6 h-6" />
            Download Now
          </button>

          <p className="text-xs text-center text-gray-500">
            Direct download • No proxy • Fast & secure
          </p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------
    HISTORY PAGE
------------------------------------------------------- */
function HistoryPage({ history, onClear, onRemove, settings }) {
  if (history.length === 0) {
    return (
      <div className="pb-24">
        <div
          className={`rounded-2xl p-12 border backdrop-blur-lg text-center ${
            settings.theme === "dark"
              ? "bg-gray-800/50 border-gray-700"
              : "bg-white/70 border-gray-200"
          }`}
        >
          <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3
            className={`text-xl font-bold mb-2 ${
              settings.theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            No History Yet
          </h3>
          <p className="text-gray-600">Your downloaded videos will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h2
          className={`text-2xl font-bold ${
            settings.theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          Download History
        </h2>

        <button
          onClick={onClear}
          className="px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear All
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl p-4 border flex items-center gap-4 backdrop-blur-lg hover:shadow-lg transition ${
              settings.theme === "dark"
                ? "bg-gray-800/50 border-gray-700"
                : "bg-white/70 border-gray-200"
            }`}
          >
            <img
              src={item.thumbnail}
              alt="thumbnail"
              className="w-24 h-16 rounded-lg object-cover"
            />

            <div className="flex-1">
              <p
                className={`font-semibold ${
                  settings.theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {item.title}
              </p>
              <p className="text-xs text-gray-500">
                {item.author} • {new Date(item.timestamp).toLocaleDateString()}
              </p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                {item.quality}
              </span>
            </div>

            <button
              onClick={() => onRemove(item.id)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
    SETTINGS PAGE
------------------------------------------------------- */
function SettingsPage({ settings, onUpdate }) {
  return (
    <div className="space-y-6 pb-24">
      <h2
        className={`text-2xl font-bold ${
          settings.theme === "dark" ? "text-white" : "text-gray-900"
        }`}
      >
        Settings
      </h2>

      <div
        className={`rounded-2xl p-6 border backdrop-blur-lg space-y-6 ${
          settings.theme === "dark"
            ? "bg-gray-800/50 border-gray-700"
            : "bg-white/70 border-gray-200"
        }`}
      >
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h3
              className={`font-semibold ${
                settings.theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Dark Mode
            </h3>
            <p className="text-sm text-gray-500">
              Switch between light and dark theme
            </p>
          </div>
          <button
            onClick={() =>
              onUpdate({ theme: settings.theme === "dark" ? "light" : "dark" })
            }
            className={`p-3 rounded-xl transition ${
              settings.theme === "dark"
                ? "bg-gray-700 text-yellow-400"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {settings.theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Default Quality */}
        <div>
          <h3
            className={`font-semibold mb-2 ${
              settings.theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Default Quality
          </h3>
          <select
            value={settings.defaultQuality}
            onChange={(e) => onUpdate({ defaultQuality: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none ${
              settings.theme === "dark"
                ? "bg-gray-700 text-white border-gray-600"
                : "bg-white border-gray-300"
            }`}
          >
            <option value="360p">360p</option>
            <option value="480p">480p</option>
            <option value="720p">720p (HD)</option>
            <option value="1080p">1080p (Full HD)</option>
          </select>
        </div>

        {/* Auto Download */}
        <div className="flex items-center justify-between">
          <div>
            <h3
              className={`font-semibold ${
                settings.theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Auto Download
            </h3>
            <p className="text-sm text-gray-500">
              Start download automatically after fetching
            </p>
          </div>
          <button
            onClick={() => onUpdate({ autoDownload: !settings.autoDownload })}
            className={`relative w-14 h-8 rounded-full transition ${
              settings.autoDownload ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition transform ${
                settings.autoDownload ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* App Info */}
      <div
        className={`rounded-2xl p-6 border backdrop-blur-lg text-center ${
          settings.theme === "dark"
            ? "bg-gray-800/50 border-gray-700"
            : "bg-white/70 border-gray-200"
        }`}
      >
        <Youtube className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3
          className={`font-bold text-lg ${
            settings.theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          YT Downloader Pro
        </h3>
        <p className="text-sm text-gray-500 mt-1">Version 1.0.0</p>
        <p className="text-xs text-gray-400 mt-4">
          Made with ❤️ by Claude
        </p>
      </div>
    </div>
  );
}