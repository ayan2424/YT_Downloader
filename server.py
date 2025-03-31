from flask import Flask, request, jsonify, send_file, Response, make_response, redirect
from flask_cors import CORS
import os
import re
import logging
import tempfile
import time
import urllib.request
import json
import subprocess
import sys
import shutil
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create downloads directory
DOWNLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
if not os.path.exists(DOWNLOADS_DIR):
    os.makedirs(DOWNLOADS_DIR)

# Function to extract video ID from various URL formats
def extract_video_id(url):
    # Try different patterns
    patterns = [
        r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})',
        r'youtu\.be\/([^"&?\/\s]{11})',
        r'youtube\.com\/embed\/([^"&?\/\s]{11})',
        r'youtube\.com\/shorts\/([^"&?\/\s]{11})',
        r'youtube\.com\/v\/([^"&?\/\s]{11})',
        r'^([a-zA-Z0-9_-]{11})$'  # Just the video ID
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

# Install pytube if not already installed
def ensure_pytube_installed():
    try:
        import pytube
        logger.info("PyTube is already installed")
        return True
    except ImportError:
        logger.info("PyTube not found, installing...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pytube"])
            logger.info("PyTube installed successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to install PyTube: {str(e)}")
            return False

# Make sure PyTube is installed
ensure_pytube_installed()

# Now import PyTube
try:
    from pytube import YouTube
    logger.info("Successfully imported PyTube")
except ImportError as e:
    logger.error(f"Failed to import PyTube: {str(e)}")

@app.route('/api/info', methods=['GET'])
def get_video_info():
    url = request.args.get('url')
    
    if not url:
        return jsonify({"error": "URL parameter is required"}), 400
    
    logger.info(f"Received request for URL: {url}")
    
    try:
        # Extract video ID if needed
        video_id = extract_video_id(url)
        
        if not video_id:
            return jsonify({"error": "Could not extract video ID from URL"}), 400
        
        # Construct a clean URL
        clean_url = f"https://www.youtube.com/watch?v={video_id}"
        logger.info(f"Using clean URL: {clean_url}")
        
        # Create YouTube object
        yt = YouTube(clean_url)
        
        # Get available streams
        streams = yt.streams.filter(progressive=True).order_by('resolution').desc()
        audio_streams = yt.streams.filter(only_audio=True).order_by('abr').desc()
        
        # Format the streams data
        formats = []
        
        # Add video formats
        for stream in streams:
            formats.append({
                "itag": stream.itag,
                "mimeType": f"video/{stream.subtype}",
                "qualityLabel": stream.resolution,
                "bitrate": stream.bitrate,
                "hasVideo": True,
                "hasAudio": True,
                "container": stream.subtype,
                "contentLength": stream.filesize
            })
        
        # Add audio formats
        for stream in audio_streams[:1]:  # Just add the highest quality audio
            formats.append({
                "itag": stream.itag,
                "mimeType": f"audio/{stream.subtype}",
                "qualityLabel": "Audio Only",
                "bitrate": stream.bitrate,
                "hasVideo": False,
                "hasAudio": True,
                "container": stream.subtype,
                "contentLength": stream.filesize
            })
        
        # Prepare the response
        response = {
            "videoId": video_id,
            "title": yt.title,
            "author": yt.author,
            "lengthSeconds": yt.length,
            "viewCount": yt.views,
            "thumbnailUrl": yt.thumbnail_url,
            "formats": formats
        }
        
        logger.info(f"Successfully fetched video info for: {yt.title}")
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Error fetching video info: {str(e)}")
        
        # Try fallback method with oEmbed API
        try:
            logger.info('Falling back to oEmbed API')
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            
            with urllib.request.urlopen(oembed_url) as response:
                oembed_data = json.loads(response.read().decode())
            
            # Create a simplified response with the available data
            formats = [
                {
                    "itag": "18",  # Default for 360p
                    "mimeType": "video/mp4",
                    "qualityLabel": "360p",
                    "bitrate": 0,
                    "hasVideo": True,
                    "hasAudio": True,
                    "container": "mp4",
                    "contentLength": "0"
                },
                {
                    "itag": "140",  # Default for audio
                    "mimeType": "audio/mp4",
                    "qualityLabel": "Audio Only",
                    "bitrate": 128000,
                    "hasVideo": False,
                    "hasAudio": True,
                    "container": "mp4",
                    "contentLength": "0"
                }
            ]
            
            response = {
                "videoId": video_id,
                "title": oembed_data.get('title', 'Unknown Title'),
                "author": oembed_data.get('author_name', 'Unknown'),
                "lengthSeconds": "0",  # Not available from oEmbed
                "viewCount": "0",  # Not available from oEmbed
                "thumbnailUrl": oembed_data.get('thumbnail_url', ''),
                "formats": formats
            }
            
            logger.info(f"Successfully fetched limited video info from oEmbed for: {response['title']}")
            
            return jsonify(response)
        except Exception as oembed_error:
            logger.error(f"oEmbed API error: {str(oembed_error)}")
            return jsonify({"error": f"Failed to fetch video information: {str(e)}"}), 500

@app.route('/api/download', methods=['GET'])
def download_video():
    # Log all request parameters for debugging
    logger.info(f"Download request parameters: {request.args}")
    
    video_id = request.args.get('videoId')
    itag = request.args.get('itag')
    format_type = request.args.get('format', 'mp4')  # Default to mp4 if not specified
    
    # Validate required parameters
    if not video_id:
        logger.error("Missing required parameter: videoId")
        return jsonify({"error": "videoId parameter is required"}), 400
    
    if not itag:
        logger.error("Missing required parameter: itag")
        return jsonify({"error": "itag parameter is required"}), 400
    
    logger.info(f"Processing download for videoId: {video_id}, itag: {itag}, format: {format_type}")
    
    # Use a more reliable method - redirect to Y2Mate or similar service
    if format_type == 'mp3':
        # For audio downloads
        redirect_url = f"https://www.y2mate.com/youtube-mp3/{video_id}"
    else:
        # For video downloads
        redirect_url = f"https://www.y2mate.com/youtube/{video_id}"
    
    logger.info(f"Redirecting to: {redirect_url}")
    
    return jsonify({
        "success": True,
        "redirectUrl": redirect_url,
        "message": "Redirecting to download service"
    })

@app.route('/api/direct-download', methods=['GET'])
def direct_download():
    """Alternative download method using direct download links"""
    video_id = request.args.get('videoId')
    format_type = request.args.get('format', 'mp4')
    
    if not video_id:
        return jsonify({"error": "videoId parameter is required"}), 400
    
    try:
        # Create a safe filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"youtube_{video_id}_{timestamp}.{format_type}"
        
        # For demonstration, we'll use a direct download service
        # In a production app, you would use a more reliable service or your own implementation
        if format_type == 'mp3':
            download_url = f"https://www.y2mate.com/youtube-mp3/{video_id}"
        else:
            download_url = f"https://www.y2mate.com/youtube/{video_id}"
        
        return jsonify({
            "success": True,
            "redirectUrl": download_url,
            "filename": filename
        })
    
    except Exception as e:
        logger.error(f"Error in direct download: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
