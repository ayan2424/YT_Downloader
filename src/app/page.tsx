"use client";

import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import AdsterraAd from "@/components/AdsterraAd";
import Image from "next/image";

interface VideoDetails {
  title: string;
  author: string;
  lengthSeconds: string;
  viewCount: string;
  thumbnailUrl: string;
  videoId: string;
  formats: Format[];
  directUrls?: boolean;
}

interface Format {
  itag: string;
  mimeType: string;
  qualityLabel: string;
  bitrate: number;
  audioQuality?: string;
  contentLength?: string;
  hasVideo: boolean;
  hasAudio: boolean;
  url?: string;
}

interface DownloadHistoryItem {
  id: string;
  title: string;
  thumbnail: string;
  format: string;
  quality: string;
  timestamp: string;
  status: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoDetails | null>(null);
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);
  const [showInterstitial, setShowInterstitial] = useState(false);

  // Show interstitial ad after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInterstitial(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowInterstitial(false), 5000);
    }, 30000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setVideoInfo(null);

    try {
      // Simple validation
      if (!url.trim()) {
        toast.error("Please enter a YouTube URL or video ID");
        setLoading(false);
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading("Fetching video information...");

      // Direct fetch to the Python API
      const response = await fetch(`http://localhost:5000/api/info?url=${encodeURIComponent(url)}`);
      
      // Clear loading toast
      toast.dismiss(loadingToast);

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to fetch video information");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setVideoInfo(data);
      toast.success("Video information fetched successfully!");
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (itag: string, format: string = 'mp4') => {
    if (!videoInfo) return;
    
    try {
      // Show loading toast
      const loadingToast = toast.loading("Preparing download...");
      
      // Add to download history
      const timestamp = new Date().toISOString();
      const id = `${videoInfo.videoId}-${itag}-${timestamp}`;
      
      // Find the format info
      const formatInfo = videoInfo.formats.find((f: Format) => f.itag.toString() === itag.toString());
      const quality = formatInfo?.qualityLabel || (format === 'mp3' ? 'Audio' : 'Unknown');
      
      setDownloadHistory(prev => [
        {
          id,
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnailUrl,
          format,
          quality,
          timestamp,
          status: 'downloading'
        },
        ...prev
      ]);
      
      // Request download URL from our backend
      const response = await fetch(`http://localhost:5000/api/download?videoId=${videoInfo.videoId}&itag=${itag}&format=${format}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.dismiss(loadingToast);
        toast.error(errorData.error || "Download failed");
        
        // Update download history to show error
        setDownloadHistory(prev => 
          prev.map(item => 
            item.id === id 
              ? { ...item, status: 'failed' } 
              : item
          )
        );
        return;
      }
      
      // Get the redirect URL from the response
      const data = await response.json();
      
      if (data.success && data.redirectUrl) {
        // Open the Y2Mate URL in a new window
        window.open(data.redirectUrl, '_blank');
        
        // Update download status
        setDownloadHistory(prev => 
          prev.map(item => 
            item.id === id 
              ? { ...item, status: 'redirected' } 
              : item
          )
        );
        
        toast.dismiss(loadingToast);
        toast.success('Redirected to download service!');
        
        // Show interstitial ad after successful download redirect
        setShowInterstitial(true);
        setTimeout(() => setShowInterstitial(false), 5000);
      } else {
        toast.dismiss(loadingToast);
        toast.error(data.error || "Failed to get download URL");
        
        // Update download history to show error
        setDownloadHistory(prev => 
          prev.map(item => 
            item.id === id 
              ? { ...item, status: 'failed' } 
              : item
          )
        );
      }
    } catch (error) {
      toast.error("An error occurred during download");
      console.error("Download error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      {/* Popunder Ad - Invisible but triggers on page load */}
      <AdsterraAd type="popunder" zoneId="123456" />
      
      {/* Top Banner Ad - Above everything */}
      <div className="mb-6">
        <AdsterraAd type="banner" zoneId="111111" className="mx-auto h-20" />
      </div>
      
      {/* Interstitial Ad - Shows at specific times */}
      {showInterstitial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="relative bg-white p-4 rounded-lg max-w-xl w-full">
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowInterstitial(false)}
            >
              ✕
            </button>
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">Advertisement</h3>
              <p className="text-sm text-gray-500">This ad helps keep our service free</p>
            </div>
            <AdsterraAd type="interstitial" zoneId="234567" className="h-60" />
          </div>
        </div>
      )}
      
      <div className="max-w-5xl mx-auto">
        {/* Banner Ad - Before Header */}
        <div className="mb-6">
          <AdsterraAd type="banner" zoneId="222222" className="mx-auto h-20" />
        </div>
        
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            VidMate-style YouTube Downloader
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Download YouTube videos in high quality with our fast and easy-to-use tool.
            Choose from various formats including MP4, MP3, and resolutions up to 1080p.
          </p>
          
          {/* Top Banner Ad */}
          <div className="mt-4">
            <AdsterraAd type="banner" zoneId="345678" className="mx-auto h-20" />
          </div>
        </header>

        {/* Banner Ad - After Header */}
        <div className="mb-6">
          <AdsterraAd type="banner" zoneId="333333" className="mx-auto h-20" />
        </div>

        <main className="space-y-8">
          {/* Banner Ad - Before Form */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <AdsterraAd type="banner" zoneId="444444" className="mx-auto h-20" />
          </div>
          
          {/* Simple Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter YouTube URL or Video ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=VIDEO_ID or just VIDEO_ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {loading ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                <p>Supported formats:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>Full YouTube URLs (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)</li>
                  <li>Short YouTube URLs (e.g., https://youtu.be/dQw4w9WgXcQ)</li>
                  <li>Just the video ID (e.g., dQw4w9WgXcQ)</li>
                </ul>
              </div>
            </form>
            
            {/* Banner Ad - Inside Form */}
            <div className="mt-4">
              <AdsterraAd type="banner" zoneId="555555" className="mx-auto h-20" />
            </div>
          </div>
          
          {/* Banner Ad - After Form */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <AdsterraAd type="banner" zoneId="666666" className="mx-auto h-20" />
          </div>
          
          {/* Native Ad - Blends with content */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-xs text-gray-500 mb-2">SPONSORED</div>
            <AdsterraAd type="native" zoneId="456789" />
          </div>
          
          {/* Banner Ad - After Native Ad */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <AdsterraAd type="banner" zoneId="777777" className="mx-auto h-20" />
          </div>
          
          {loading && (
            <div className="flex justify-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* Banner Ad - Before Video Info */}
          {videoInfo && !loading && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <AdsterraAd type="banner" zoneId="888888" className="mx-auto h-20" />
            </div>
          )}
          
          {/* Video Info */}
          {videoInfo && !loading && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="md:flex">
                <div className="md:flex-shrink-0">
                  <Image 
                    className="h-48 w-full object-cover md:w-48" 
                    src={videoInfo.thumbnailUrl} 
                    alt={videoInfo.title}
                    width={192}
                    height={192}
                  />
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">{videoInfo.title}</h2>
                  <p className="text-gray-600 mb-4">By {videoInfo.author}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {videoInfo.formats
                      .filter((format: Format) => format.hasVideo)
                      .map((format: Format) => (
                        <button
                          key={format.itag}
                          onClick={() => handleDownload(format.itag, 'mp4')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                          {format.qualityLabel} MP4
                        </button>
                      ))}
                    
                    {videoInfo.formats
                      .filter((format: Format) => !format.hasVideo && format.hasAudio)
                      .slice(0, 1)
                      .map((format: Format) => (
                        <button
                          key={format.itag}
                          onClick={() => handleDownload(format.itag, 'mp3')}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Audio MP3
                        </button>
                      ))}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p>Views: {parseInt(videoInfo.viewCount).toLocaleString()}</p>
                    <p>Duration: {Math.floor(parseInt(videoInfo.lengthSeconds) / 60)}:{(parseInt(videoInfo.lengthSeconds) % 60).toString().padStart(2, '0')}</p>
                  </div>
                </div>
              </div>
              
              {/* Banner Ad - Inside Video Info */}
              <div className="p-4 border-t border-gray-200">
                <AdsterraAd type="banner" zoneId="999999" className="mx-auto h-20" />
              </div>
            </div>
          )}
          
          {/* Banner Ad - After Video Info */}
          {videoInfo && !loading && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <AdsterraAd type="banner" zoneId="101010" className="mx-auto h-20" />
            </div>
          )}
          
          {/* Social Bar Ad - Interactive social media style ad */}
          <div className="my-6">
            <AdsterraAd type="social-bar" zoneId="567890" />
          </div>
          
          {/* Banner Ad - Before Download History */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <AdsterraAd type="banner" zoneId="121212" className="mx-auto h-20" />
          </div>
          
          {/* Download History */}
          {downloadHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Download History</h3>
              <div className="space-y-4">
                {downloadHistory.map((item) => (
                  <div key={item.id} className="flex items-center border-b pb-3">
                    <Image 
                      src={item.thumbnail} 
                      alt={item.title} 
                      className="w-16 h-12 object-cover rounded mr-3"
                      width={64}
                      height={48}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        {item.quality} {item.format.toUpperCase()} • {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="ml-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : item.status === 'failed' 
                            ? 'bg-red-100 text-red-800' 
                            : item.status === 'redirected'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.status === 'completed' ? 'Completed' : item.status === 'failed' ? 'Failed' : item.status === 'redirected' ? 'Redirected' : 'Downloading...'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Banner Ad - Inside Download History */}
              <div className="mt-4">
                <AdsterraAd type="banner" zoneId="131313" className="mx-auto h-20" />
              </div>
            </div>
          )}
          
          {/* Bottom Banner Ad */}
          <div className="my-6">
            <AdsterraAd type="banner" zoneId="678901" className="mx-auto h-20" />
          </div>
          
          {/* Extra Banner Ad */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <AdsterraAd type="banner" zoneId="141414" className="mx-auto h-20" />
          </div>
        </main>
        
        {/* Banner Ad - Before Footer */}
        <div className="mt-8 mb-6">
          <AdsterraAd type="banner" zoneId="151515" className="mx-auto h-20" />
        </div>
        
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>&copy; 2025 YouTube Video Downloader. All rights reserved.</p>
          <p className="mt-1">Built with Next.js, React, Python, and PyTube</p>
          
          {/* Footer Banner Ad */}
          <div className="mt-4">
            <AdsterraAd type="banner" zoneId="789012" className="mx-auto h-20" />
          </div>
          
          {/* Extra Footer Banner Ad */}
          <div className="mt-4">
            <AdsterraAd type="banner" zoneId="161616" className="mx-auto h-20" />
          </div>
        </footer>
        
        {/* Final Banner Ad */}
        <div className="mt-6">
          <AdsterraAd type="banner" zoneId="171717" className="mx-auto h-20" />
        </div>
      </div>
      
      {/* Toast notifications */}
      <Toaster position="bottom-center" />
    </div>
  );
}
