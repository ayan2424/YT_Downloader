import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

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

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const itag = request.nextUrl.searchParams.get('itag');
  const format = request.nextUrl.searchParams.get('format');
  const videoId = request.nextUrl.searchParams.get('videoId');

  // Either URL or videoId is required
  if (!url && !videoId) {
    return NextResponse.json(
      { error: 'URL or videoId parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Determine the YouTube URL to use
    let finalVideoId = '';
    
    if (videoId) {
      // If we have a video ID, use it directly
      finalVideoId = videoId;
    } else if (url) {
      // Try to extract the ID from the URL
      const extractedId = extractVideoId(url);
      if (!extractedId) {
        return NextResponse.json(
          { error: 'Invalid YouTube URL. Could not extract video ID.' },
          { status: 400 }
        );
      }
      finalVideoId = extractedId;
    }
    
    console.log('Download request for video ID:', finalVideoId);
    console.log('Format:', format, 'itag:', itag);
    
    // Create direct download links based on format and itag
    if (format === 'mp3') {
      // Redirect to a third-party service for MP3 download
      const mp3DownloadUrl = `https://www.y2mate.com/youtube-mp3/${finalVideoId}`;
      return NextResponse.redirect(mp3DownloadUrl);
    } else {
      // For video downloads, use a direct download service
      let downloadUrl = '';
      
      if (itag) {
        // If itag is specified, use it for direct download
        downloadUrl = `https://www.y2mate.com/youtube/${finalVideoId}/mp4/${itag}`;
      } else {
        // Default to highest quality
        downloadUrl = `https://www.y2mate.com/youtube/${finalVideoId}`;
      }
      
      return NextResponse.redirect(downloadUrl);
    }
  } catch (error) {
    console.error('Error processing download:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to process download';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
