"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaPause, FaTrash, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

interface DownloadItem {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  timestamp: string;
  status: string;
  progress: number;
}

const DownloadManager: React.FC = () => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load downloads from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDownloads = localStorage.getItem('downloads');
      if (savedDownloads) {
        try {
          setDownloads(JSON.parse(savedDownloads));
        } catch (error) {
          console.error('Error parsing saved downloads:', error);
          localStorage.removeItem('downloads');
        }
      }
    }
  }, []);

  // Save downloads to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('downloads', JSON.stringify(downloads));
    }
  }, [downloads]);

  // This would be connected to actual download progress in a real implementation
  // For demo purposes, we'll simulate progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDownloads(prevDownloads => 
        prevDownloads.map(download => {
          if (download.status === 'downloading' && download.progress < 100) {
            const newProgress = Math.min(download.progress + 5, 100);
            return {
              ...download,
              progress: newProgress,
              status: newProgress === 100 ? 'completed' : 'downloading'
            };
          }
          return download;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleDownloadStatus = (id: string) => {
    setDownloads(prevDownloads =>
      prevDownloads.map(download => {
        if (download.id === id) {
          return {
            ...download,
            status: download.status === 'downloading' ? 'paused' : 'downloading'
          };
        }
        return download;
      })
    );
  };

  const removeDownload = (id: string) => {
    setDownloads(prevDownloads => prevDownloads.filter(download => download.id !== id));
  };

  const formatTimestamp = (timestamp: string) => {
    if (typeof window === 'undefined') return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown date';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-14 right-0 w-80 md:w-96 bg-white rounded-lg shadow-xl overflow-hidden"
          >
            <div className="bg-blue-600 text-white p-3 flex justify-between items-center">
              <h3 className="font-medium">Download Manager</h3>
              <span className="text-sm bg-blue-700 rounded-full px-2 py-0.5">
                {downloads.length} {downloads.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {downloads.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No downloads yet
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {downloads.map(download => (
                    <li key={download.id} className="p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1 pr-4">
                          <h4 className="text-sm font-medium text-gray-900 truncate" title={download.title}>
                            {download.title}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {formatTimestamp(download.timestamp)}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          {download.status !== 'completed' && download.status !== 'error' && (
                            <button
                              onClick={() => toggleDownloadStatus(download.id)}
                              className="text-gray-400 hover:text-blue-600 p-1"
                            >
                              {download.status === 'downloading' ? <FaPause size={14} /> : <FaPlay size={14} />}
                            </button>
                          )}
                          <button
                            onClick={() => removeDownload(download.id)}
                            className="text-gray-400 hover:text-red-600 p-1"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div
                          className={`h-1.5 rounded-full ${
                            download.status === 'error' ? 'bg-red-500' : 
                            download.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${download.progress}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">
                          {download.progress}%
                        </span>
                        <span className="text-xs flex items-center">
                          {download.status === 'downloading' && 'Downloading...'}
                          {download.status === 'paused' && 'Paused'}
                          {download.status === 'completed' && (
                            <span className="flex items-center text-green-600">
                              <FaCheckCircle className="mr-1" size={12} />
                              Completed
                            </span>
                          )}
                          {download.status === 'error' && (
                            <span className="flex items-center text-red-600">
                              <FaExclamationCircle className="mr-1" size={12} />
                              Failed
                            </span>
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="bg-gray-50 p-2 text-right border-t border-gray-100">
              <button
                onClick={() => setDownloads([])}
                className="text-xs text-gray-500 hover:text-red-600"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DownloadManager;
