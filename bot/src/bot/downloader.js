import { config } from "./config.js";

export const downloader = {
  // Simple regex check for supported platforms
  detectPlatform(url) {
    if (url.includes("instagram.com") || url.includes("instagr.am"))
      return "instagram";
    if (url.includes("tiktok.com") || url.includes("vm.tiktok.com"))
      return "tiktok";
    if (url.includes("youtube.com") || url.includes("youtu.be"))
      return "youtube";
    if (
      url.includes("twitter.com") ||
      url.includes("x.com") ||
      url.includes("t.co")
    )
      return "twitter";
    if (url.includes("soundcloud.com")) return "soundcloud";
    if (url.includes("pinterest.com") || url.includes("pin.it"))
      return "pinterest";
    return null;
  },

  async extract(url, platform, quality = "1080") {
    try {
      // Primary API: Cobalt Tools
      const result = await this.extractWithCobalt(url, platform, quality);
      if (result.status === "success" || result.status === "picker") {
        return result;
      }

      // Fallback: Try alternative extraction method
      console.warn(`Cobalt failed for ${platform}, trying fallback...`);
      return await this.extractFallback(url, platform);
    } catch (error) {
      console.error(`Downloader Error (${platform}):`, error);
      return { status: "error", message: error.message };
    }
  },

  async extractWithCobalt(url, platform, quality = "1080") {
    const apiUrl = "https://api.cobalt.tools/api/json";

    const payload = {
      url: url,
      vQuality: quality,
      aFormat: "mp3",
      isAudioOnly: platform === "soundcloud",
      isNoWatermark: true,
      filenamePattern: "basic",
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.download.timeout),
    });

    if (!response.ok) {
      throw new Error(`Cobalt API returned ${response.status}`);
    }

    const data = await response.json();

    // Handle picker response (multiple quality options)
    if (data.status === "picker" && data.picker) {
      return {
        status: "picker",
        picker: data.picker,
        url: data.url,
      };
    }

    return data;
  },

  async extractFallback(url, platform) {
    // Fallback extraction using alternative APIs or methods
    // For production, you might integrate additional APIs here
    return {
      status: "error",
      message: "جميع خدمات الاستخراج غير متاحة حالياً",
    };
  },

  // Helper for YouTube qualities with size estimation
  getYouTubeQualities(durationSeconds = 180) {
    // Rough size estimation based on bitrate and duration
    const estimateSize = (bitrateMbps, duration) => {
      const sizeMB = (bitrateMbps * duration) / 8;
      if (sizeMB < 1) return `${Math.round(sizeMB * 1024)} KB`;
      return `${Math.round(sizeMB)} MB`;
    };

    return [
      { quality: "144p", id: "144", size: estimateSize(0.1, durationSeconds) },
      { quality: "240p", id: "240", size: estimateSize(0.3, durationSeconds) },
      { quality: "360p", id: "360", size: estimateSize(0.5, durationSeconds) },
      { quality: "480p", id: "480", size: estimateSize(1, durationSeconds) },
      { quality: "720p", id: "720", size: estimateSize(2.5, durationSeconds) },
      { quality: "1080p", id: "1080", size: estimateSize(5, durationSeconds) },
      { quality: "1440p", id: "1440", size: estimateSize(9, durationSeconds) },
      { quality: "4K", id: "2160", size: estimateSize(20, durationSeconds) },
    ];
  },

  // Audio quality options
  getAudioQualities() {
    return [
      { quality: "MP3 128kbps", id: "128", format: "mp3" },
      { quality: "MP3 192kbps", id: "192", format: "mp3" },
      { quality: "MP3 320kbps", id: "320", format: "mp3" },
    ];
  },

  // Validate URL format
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
};
