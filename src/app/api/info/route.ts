import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

// Define interfaces for our data structures
interface VideoFormat {
  itag: string;
  mimeType: string;
  qualityLabel: string;
  bitrate: number;
  hasVideo: boolean;
  hasAudio: boolean;
  container?: string;
  codecs?: string;
  contentLength?: string;
}

// Utility function to extract video ID from various URL formats
function extractVideoId(url: string): string | null {
  // Array of regex patterns to try
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /youtu\.be\/([^"&?\/\s]{11})/i,
    /youtube\.com\/embed\/([^"&?\/\s]{11})/i,
    /youtube\.com\/shorts\/([^"&?\/\s]{11})/i,
    /youtube\.com\/v\/([^"&?\/\s]{11})/i,
    /^([a-zA-Z0-9_-]{11})$/  // Just the video ID
  ];

  // Try each pattern
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Function to fetch video info using YouTube's oEmbed API
async function fetchOEmbedInfo(videoId: string) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    console.log('Fetching oEmbed data from:', oembedUrl);
    
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      throw new Error(`oEmbed API returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('oEmbed data:', data);
    
    return data;
  } catch (error) {
    console.error('Error fetching oEmbed data:', error);
    throw error;
  }
}

// Function to fetch video info from Rapid API
async function fetchRapidApiInfo(videoId: string) {
  try {
    const url = `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}`;
    
    console.log('Fetching from Rapid API:', url);
    
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': '7c0a18d3e2msh4c5c64f480e5f67p1e9b68jsn5e2b9b1cd3cc',
        'X-RapidAPI-Host': 'youtube-media-downloader.p.rapidapi.com'
      }
    };
    
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Rapid API returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Rapid API data received');
    
    return data;
  } catch (error) {
    console.error('Error fetching from Rapid API:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  console.log('Received request for URL:', url);
  
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(url);
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID from URL' },
        { status: 400 }
      );
    }
    
    console.log('Extracted video ID:', videoId);
    
    // Try to fetch video info from Rapid API
    try {
      const rapidApiData = await fetchRapidApiInfo(videoId);
      
      // Format the response
      const formats: VideoFormat[] = [];
      
      // Add video formats
      if (rapidApiData.videos && rapidApiData.videos.items) {
        rapidApiData.videos.items.forEach((item: any) => {
          formats.push({
            itag: item.id.toString(),
            mimeType: item.mimeType,
            qualityLabel: item.qualityLabel,
            bitrate: item.bitrate,
            hasVideo: true,
            hasAudio: item.audioQuality !== undefined,
            container: item.container,
            codecs: item.codecs,
            contentLength: item.contentLength
          });
        });
      }
      
      // Add audio formats
      if (rapidApiData.audios && rapidApiData.audios.items) {
        rapidApiData.audios.items.forEach((item: any) => {
          formats.push({
            itag: item.id.toString(),
            mimeType: 'audio/' + (item.container || 'mp3'),
            qualityLabel: 'Audio Only',
            bitrate: item.bitrate,
            hasVideo: false,
            hasAudio: true,
            container: item.container,
            codecs: item.codecs,
            contentLength: item.contentLength
          });
        });
      }
      
      // Sort formats by quality
      formats.sort((a: VideoFormat, b: VideoFormat) => {
        // Video formats come first
        if (a.hasVideo && !b.hasVideo) return -1;
        if (!a.hasVideo && b.hasVideo) return 1;
        
        // For video formats, sort by quality
        if (a.hasVideo && b.hasVideo) {
          const aRes = parseInt(a.qualityLabel?.split('p')[0] || '0');
          const bRes = parseInt(b.qualityLabel?.split('p')[0] || '0');
          return bRes - aRes; // Higher resolution first
        }
        
        // For audio formats, sort by bitrate
        return b.bitrate - a.bitrate; // Higher bitrate first
      });
      
      // Create response
      const response = {
        videoId: videoId,
        title: rapidApiData.title,
        author: rapidApiData.channel?.name || 'Unknown',
        lengthSeconds: rapidApiData.lengthSeconds?.toString() || '0',
        viewCount: rapidApiData.viewCount?.toString() || '0',
        thumbnailUrl: rapidApiData.thumbnails?.[0]?.url || '',
        formats: formats
      };
      
      console.log('Successfully fetched video info for:', response.title);
      
      return NextResponse.json(response);
    } catch (rapidApiError) {
      console.error('Rapid API error:', rapidApiError);
      
      // Fallback to oEmbed API
      try {
        console.log('Falling back to oEmbed API');
        const oembedData = await fetchOEmbedInfo(videoId);
        
        // Create a simplified response with the available data
        const formats: VideoFormat[] = [
          {
            itag: '18', // Default for 360p
            mimeType: 'video/mp4',
            qualityLabel: '360p',
            bitrate: 0,
            hasVideo: true,
            hasAudio: true,
            container: 'mp4',
            codecs: 'avc1.42001E, mp4a.40.2',
            contentLength: '0'
          },
          {
            itag: '140', // Default for audio
            mimeType: 'audio/mp4',
            qualityLabel: 'Audio Only',
            bitrate: 128000,
            hasVideo: false,
            hasAudio: true,
            container: 'mp4',
            codecs: 'mp4a.40.2',
            contentLength: '0'
          }
        ];
        
        const response = {
          videoId: videoId,
          title: oembedData.title,
          author: oembedData.author_name,
          lengthSeconds: '0', // Not available from oEmbed
          viewCount: '0', // Not available from oEmbed
          thumbnailUrl: oembedData.thumbnail_url,
          formats: formats
        };
        
        console.log('Successfully fetched limited video info from oEmbed for:', response.title);
        
        return NextResponse.json(response);
      } catch (oembedError) {
        console.error('oEmbed API error:', oembedError);
        throw new Error('All methods failed to fetch video information');
      }
    }
  } catch (error) {
    console.error('Error fetching video info:', error);
    
    let errorMessage = 'Failed to fetch video information';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
