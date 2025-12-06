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

  const { history, addToHistory, clearHistory, removeItem } = useDownloadHistory();
  const { settings, updateSettings } = useSettings();

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
      
      // Auto-select first quality option
      if (data.data.qualities && data.data.qualities.length > 0) {
        setSelectedQuality(data.data.qualities[0].quality);
      }
      
      setCurrentPage("download");
    } catch (err) {
      setError(err.message || "Failed to fetch video info");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    // Find the selected quality's download URL
    const selectedVideo = result.qualities?.find(q => 
      q.quality === selectedQuality
    );

    const videoUrl = selectedVideo?.url || result.qualities?.[0]?.url;

    if (!videoUrl) {
      setError("Download URL not available for selected quality");
      return;
    }

    // Add to history
    addToHistory({
      title: result.title,
      author: result.author,
      thumbnail: result.thumbnail,
      url: result.videoUrl,
      quality: selectedQuality,
    });

    // Clean title for filename
    const cleanTitle = result.title
      .replace(/[^\w\s-]/gi, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    // Determine file extension based on quality type
    const isAudio = selectedQuality.toLowerCase().includes('audio');
    const extension = isAudio ? 'mp3' : 'mp4';

    const downloadUrl = `/api/download?url=${encodeURIComponent(
      videoUrl
    )}&filename=${encodeURIComponent(`${cleanTitle}.${extension}`)}`;

    window.location.href = downloadUrl;
  };

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
        return <SettingsPage settings={settings} onUpdate={updateSettings} />;
      default:
        return <HomePage onNavigate={setCurrentPage} settings={settings} />;
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        settings.theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50"
      }`}
    >
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

      <main className="max-w-7xl mx-auto px-4 py-6">{renderPage()}</main>

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
      desc: "720p, 1080p, 4K available",
      action: "download",
    },
  ];

  return (
    <div className="space-y-8 pb-24">
      <div
        className={`rounded-3xl p-8 border text-center ${
          settings.theme === "dark"
            ? "bg-gradient-to-br from-red-900/50 to-orange-900/50 border-red-700"
            : "bg-gradient-to-br from-red-100 to-orange-100 border-red-200"
        }`}
      >
        <div className="inline-block bg-gradient-to-br from-red-600 to-red-500 p-4 rounded-2xl mb-4">
          <Youtube className="w-12 h-12 text-white" />
        </div>
        <h2
          className={`text-3xl font-bold mb-2 ${
            settings.theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          Download YouTube Videos
        </h2>
        <p
          className={`mb-6 ${
            settings.theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Fast, free & HD quality downloads
        </p>
        <button
          onClick={() => onNavigate("download")}
          className="bg-gradient-to-r from-red-600 to-red-500 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg"
        >
          Start Downloading
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <button
            key={i}
            onClick={() => onNavigate(f.action)}
            className={`backdrop-blur-lg p-6 rounded-2xl border hover:shadow-xl transition text-left w-full hover:scale-105 ${
              settings.theme === "dark"
                ? "bg-gray-800/50 border-gray-700"
                : "bg-white/70 border-gray-200"
            }`}
          >
            <div className="bg-gradient-to-br from-red-600 to-red-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <f.icon className="w-6 h-6 text-white" />
            </div>
            <h3
              className={`font-bold text-lg mb-2 ${
                settings.theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {f.title}
            </h3>
            <p
              className={`text-sm ${
                settings.theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {f.desc}
            </p>
          </button>
        ))}
      </div>

      <div
        className={`backdrop-blur-lg rounded-2xl p-6 border ${
          settings.theme === "dark"
            ? "bg-gray-800/50 border-gray-700"
            : "bg-white/70 border-gray-200"
        }`}
      >
        <h3
          className={`font-bold text-xl mb-4 ${
            settings.theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          How It Works
        </h3>
        <div className="space-y-3">
          <Step number="1" text="Copy YouTube video URL" theme={settings.theme} />
          <Step number="2" text="Paste URL and select quality" theme={settings.theme} />
          <Step number="3" text="Download video instantly" theme={settings.theme} />
        </div>
      </div>
    </div>
  );
}

function Step({ number, text, theme }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-gradient-to-br from-red-600 to-red-500 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
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
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views;
  };

  return (
    <div className="space-y-6 pb-24">
      <div
        className={`backdrop-blur-lg rounded-2xl p-6 border shadow-lg ${
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
          Download Video
        </h2>

        <div className="space-y-4">
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
              placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition ${
                settings.theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste any YouTube video URL
            </p>
          </div>

          <button
            onClick={onFetch}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Fetching Video...
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div
          className={`backdrop-blur-lg rounded-2xl p-6 border ${
            settings.theme === "dark"
              ? "bg-gray-800/50 border-gray-700"
              : "bg-white/70 border-gray-200"
          }`}
        >
          <div className="space-y-4">
            <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
      )}

      {result && !loading && (
        <div
          className={`backdrop-blur-lg rounded-2xl p-6 border shadow-lg space-y-4 ${
            settings.theme === "dark"
              ? "bg-gray-800/50 border-gray-700"
              : "bg-white/70 border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3
              className={`text-xl font-bold ${
                settings.theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Video Ready!
            </h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
              <CheckCircle className="w-4 h-4" />
              READY
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden">
            <img
              src={result.thumbnail}
              alt={result.title}
              className="w-full h-auto rounded-xl"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Play className="w-16 h-16 text-white opacity-80" />
            </div>
          </div>

          <div>
            <h4
              className={`font-bold text-lg mb-2 ${
                settings.theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {result.title}
            </h4>
            <p
              className={`text-sm mb-3 ${
                settings.theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              by {result.author}
            </p>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{formatViews(result.views)} views</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(result.duration)}</span>
              </div>
            </div>
          </div>

          <div>
            <label
              className={`block text-sm font-semibold mb-2 ${
                settings.theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Select Quality ({result.qualities?.length || 0} options available)
            </label>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none ${
                settings.theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300"
              }`}
            >
              {result.qualities && result.qualities.length > 0 ? (
                result.qualities.map((q, idx) => (
                  <option key={idx} value={q.quality}>
                    {q.quality} {q.filesize ? `- ${q.filesize}` : ''}
                    {q.type === 'audio' ? ' (Audio Only)' : ''}
                  </option>
                ))
              ) : (
                <option value="">No qualities available</option>
              )}
            </select>
          </div>

          <button
            onClick={onDownload}
            disabled={!result.qualities || result.qualities.length === 0}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
          >
            <Download className="w-6 h-6" />
            Download Now
          </button>

          <p className="text-xs text-center text-gray-500">
            Free • Fast • No registration required
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
          className={`backdrop-blur-lg rounded-2xl p-12 border text-center ${
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
          <p className="text-gray-600">Your downloads will appear here</p>
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
            className={`backdrop-blur-lg rounded-xl p-4 border flex items-center gap-4 hover:shadow-lg transition ${
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
        className={`backdrop-blur-lg rounded-2xl p-6 border space-y-8 ${
          settings.theme === "dark"
            ? "bg-gray-800/50 border-gray-700"
            : "bg-white/70 border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className={`font-semibold ${
                settings.theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Dark Mode
            </h3>
            <p className="text-sm text-gray-600">Switch between themes</p>
          </div>
          <button
            onClick={() =>
              onUpdate({ theme: settings.theme === "light" ? "dark" : "light" })
            }
            className={`w-14 h-8 rounded-full transition ${
              settings.theme === "dark" ? "bg-red-600" : "bg-gray-300"
            } relative`}
          >
            <div
              className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all flex items-center justify-center ${
                settings.theme === "dark" ? "left-7" : "left-1"
              }`}
            >
              {settings.theme === "dark" ? (
                <Moon className="w-3 h-3 text-red-600" />
              ) : (
                <Sun className="w-3 h-3 text-gray-600" />
              )}
            </div>
          </button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div>
            <h3
              className={`font-semibold ${
                settings.theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Default Quality
            </h3>
            <p className="text-sm text-gray-600">Preferred download quality</p>
          </div>
          <select
            value={settings.defaultQuality}
            onChange={(e) => onUpdate({ defaultQuality: e.target.value })}
            className={`px-4 py-2 rounded-xl font-semibold ${
              settings.theme === "dark"
                ? "bg-gray-700 text-white"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
          </select>
        </div>
      </div>

      <div
        className={`backdrop-blur-lg rounded-2xl p-6 border ${
          settings.theme === "dark"
            ? "bg-gray-800/50 border-gray-700"
            : "bg-white/70 border-gray-200"
        }`}
      >
        <h3
          className={`font-bold mb-2 ${
            settings.theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          About
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          YT Downloader Pro — Download YouTube videos in HD quality
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>100% Free • HD Quality • Fast Downloads</span>
        </div>
      </div>
    </div>
  );
}