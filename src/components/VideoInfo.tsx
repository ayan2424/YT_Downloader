"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaDownload, FaMusic, FaVideo } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface Format {
  itag: string;
  mimeType: string;
  qualityLabel: string;
  bitrate: number;
  audioQuality: string;
  contentLength: string;
  hasVideo: boolean;
  hasAudio: boolean;
  url?: string; // Add url property to Format interface
}

interface VideoDetails {
  title: string;
  author: string;
  lengthSeconds: string;
  viewCount: string;
  thumbnailUrl: string;
  formats: Format[];
  directUrls?: boolean; // Flag to indicate if we're using direct URLs
}

interface VideoInfoProps {
  videoInfo: VideoDetails | null;
}

const VideoInfo: React.FC<VideoInfoProps> = ({ videoInfo }) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  
  if (!videoInfo) return null;
  
  // Filter formats to get unique quality options with both audio and video
  const videoFormats = videoInfo.formats
    .filter(format => format.hasVideo && format.hasAudio && format.qualityLabel)
    .reduce((acc: Format[], current) => {
      const x = acc.find(item => item.qualityLabel === current.qualityLabel);
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, [])
    .sort((a, b) => {
      const aRes = parseInt(a.qualityLabel.replace('p', ''));
      const bRes = parseInt(b.qualityLabel.replace('p', ''));
      return bRes - aRes;
    });
  
  // Get highest quality audio only format
  const audioFormat = videoInfo.formats
    .filter(format => !format.hasVideo && format.hasAudio)
    .sort((a, b) => b.bitrate - a.bitrate)[0];
  
  const formatDuration = (seconds: string) => {
    const sec = parseInt(seconds);
    const minutes = Math.floor(sec / 60);
    const remainingSeconds = sec % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const formatViews = (views: string) => {
    const viewCount = parseInt(views);
    if (viewCount >= 1000000) {
      return `${(viewCount / 1000000).toFixed(1)}M views`;
    } else if (viewCount >= 1000) {
      return `${(viewCount / 1000).toFixed(1)}K views`;
    }
    return `${viewCount} views`;
  };
  
  const handleDownload = async (itag: string, format: string = 'mp4') => {
    try {
      setDownloading(itag);
      
      if (typeof window !== 'undefined') {
        // Create download link
        let downloadUrl;
        
        if (videoInfo.directUrls) {
          // If we have direct URLs from youtube-dl-exec
          const selectedFormat = videoInfo.formats.find(f => f.itag === itag);
          if (selectedFormat && selectedFormat.url) {
            // Use the direct URL
            window.open(selectedFormat.url, '_blank');
            toast.success('Download started!');
            setDownloading(null);
            return;
          } else {
            // Fallback to API
            downloadUrl = `/api/download?url=${encodeURIComponent(videoInfo.title)}&itag=${itag}&format=${format}`;
          }
        } else {
          // Use our API endpoint
          downloadUrl = `/api/download?url=${encodeURIComponent(videoInfo.title)}&itag=${itag}&format=${format}`;
        }
        
        // Open in new tab for download
        window.open(downloadUrl, '_blank');
        
        toast.success('Download started!');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to start download');
    } finally {
      setDownloading(null);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-2/5">
          <Image
            src={videoInfo.thumbnailUrl}
            alt={videoInfo.title}
            className="w-full h-auto rounded-lg shadow-sm"
            width={480}
            height={360}
          />
        </div>
        
        <div className="w-full md:w-3/5">
          <h3 className="text-xl font-bold text-gray-800 mb-2">{videoInfo.title}</h3>
          <p className="text-gray-600 mb-1">{videoInfo.author}</p>
          <div className="flex items-center text-gray-500 text-sm mb-4">
            <span>{formatDuration(videoInfo.lengthSeconds)}</span>
            <span className="mx-2">•</span>
            <span>{formatViews(videoInfo.viewCount)}</span>
          </div>
          
          <div className="mt-4">
            <h4 className="font-semibold text-gray-700 mb-2">Download Options</h4>
            
            <div className="space-y-3">
              {/* MP3 Audio Download */}
              {audioFormat && (
                <button
                  onClick={() => handleDownload(audioFormat.itag, 'mp3')}
                  disabled={downloading === audioFormat.itag}
                  className="w-full flex items-center justify-between bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium py-2 px-4 rounded-lg transition duration-300"
                >
                  <div className="flex items-center">
                    <FaMusic className="mr-2" />
                    <span>MP3 Audio</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm mr-2">High Quality</span>
                    {downloading === audioFormat.itag ? (
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FaDownload />
                    )}
                  </div>
                </button>
              )}
              
              {/* Video Downloads */}
              {videoFormats.map((format) => (
                <button
                  key={format.itag}
                  onClick={() => handleDownload(format.itag)}
                  disabled={downloading === format.itag}
                  className="w-full flex items-center justify-between bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-2 px-4 rounded-lg transition duration-300"
                >
                  <div className="flex items-center">
                    <FaVideo className="mr-2" />
                    <span>MP4 Video</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm mr-2">{format.qualityLabel}</span>
                    {downloading === format.itag ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FaDownload />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoInfo;
