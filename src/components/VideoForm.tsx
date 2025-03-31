import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { FaSearch, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';

// Define interfaces
interface VideoFormProps {
  onVideoInfo: (info: VideoInfo) => void;
  setLoading: (loading: boolean) => void;
  setVideoInfo: (info: VideoInfo | null) => void;
  setError: (error: string) => void;
  setDownloadHistory: React.Dispatch<React.SetStateAction<DownloadItem[]>>;
}

interface FormValues {
  url: string;
}

interface DownloadItem {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  timestamp: string;
  status: string;
  progress: number;
}

interface VideoInfo {
  title: string;
  author: string;
  lengthSeconds: string;
  viewCount: string;
  thumbnailUrl: string;
  formats: Format[];
  limitedInfo?: boolean;
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

// Less strict URL validation schema
const VideoSchema = Yup.object().shape({
  url: Yup.string()
    .required('Please enter a URL')
    .test('is-youtube-like', 'Please enter what looks like a YouTube URL', 
      (value) => !value || value.includes('youtube') || value.includes('youtu.be') || /[a-zA-Z0-9_-]{11}/.test(value))
});

const VideoForm: React.FC<VideoFormProps> = ({ setLoading, setVideoInfo, setError, setDownloadHistory }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper function to clean up YouTube URLs
  const cleanYouTubeUrl = (url: string): string => {
    // If it's just an ID (11 characters), convert it to a full URL
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return `https://www.youtube.com/watch?v=${url}`;
    }
    
    // Otherwise return as is
    return url;
  };

  const handleSubmit = async (values: FormValues, { setSubmitting, resetForm }: FormikHelpers<FormValues>) => {
    try {
      setError('');
      setVideoInfo(null);
      setLoading(true);
      
      // Clean up the URL if needed
      const cleanedUrl = cleanYouTubeUrl(values.url.trim());
      
      // Show loading toast
      const loadingToast = toast.loading('Fetching video information...');
      
      // Fetch video info
      const response = await fetch(`/api/info?url=${encodeURIComponent(cleanedUrl)}`);
      
      // Clear loading toast
      toast.dismiss(loadingToast);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        
        // Handle specific error cases
        if (errorData.error.includes('Invalid YouTube URL')) {
          setError('Please enter a valid YouTube URL or video ID (e.g., https://youtube.com/watch?v=VIDEO_ID or just VIDEO_ID)');
        } else if (errorData.error.includes('restricted')) {
          setError('This video is restricted or unavailable. Please try another video.');
        } else {
          setError(errorData.error || 'Failed to fetch video information');
        }
        
        toast.error('Error: ' + (errorData.error || 'Failed to fetch video information'));
        setSubmitting(false);
        setLoading(false);
        return;
      }
      
      const data: VideoInfo = await response.json();
      
      // Check if we have limited info (from oEmbed fallback)
      if (data.limitedInfo) {
        toast.error('Limited video information available. Some features may not work correctly.');
      } else {
        toast.success('Video information fetched successfully!');
      }
      
      // Set video info
      setVideoInfo(data);
      
      // Add to download history
      const newDownload: DownloadItem = {
        id: Math.random().toString(36).substring(2, 9),
        title: data.title,
        thumbnail: data.thumbnailUrl,
        url: cleanedUrl,
        timestamp: new Date().toISOString(),
        status: 'ready',
        progress: 0,
      };
      
      // Update download history
      setDownloadHistory(prev => [newDownload, ...prev]);
      
      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error fetching video info:', error);
      setError('Failed to fetch video information. Please try again.');
      toast.error('Error: Failed to fetch video information');
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Formik
        initialValues={{ url: '' }}
        validationSchema={VideoSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                Enter YouTube URL or Video ID
              </label>
              <div className="relative">
                <Field
                  type="text"
                  name="url"
                  id="url"
                  placeholder="https://www.youtube.com/watch?v=VIDEO_ID or just VIDEO_ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                </button>
              </div>
              <ErrorMessage name="url" component="div" className="mt-1 text-sm text-red-600" />
              {errorMessage && <div className="mt-1 text-sm text-red-600">{errorMessage}</div>}
            </div>
            
            <div className="text-xs text-gray-500">
              <p>Supported formats:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>Full YouTube URLs (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)</li>
                <li>Short YouTube URLs (e.g., https://youtu.be/dQw4w9WgXcQ)</li>
                <li>Just the video ID (e.g., dQw4w9WgXcQ)</li>
              </ul>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default VideoForm;
