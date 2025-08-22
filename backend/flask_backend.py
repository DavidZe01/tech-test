from flask import Flask, request, jsonify
from flask_cors import CORS
from medical_extraction_system import app as medical_app, model
import uuid
import logging
from datetime import datetime, timezone
import traceback
import os
import tempfile
from werkzeug.utils import secure_filename
import openai
import requests
from urllib.parse import urlparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Store active sessions
active_sessions = {}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "Medical Information Extraction API"
    }), 200

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Main chat endpoint for medical information extraction.
    
    Expected JSON payload:
    {
        "message": "Patient text or medical query",
        "session_id": "optional_session_id"
    }
    """
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                "error": "Content-Type must be application/json"
            }), 400
        
        data = request.get_json()
        
        # Validate required fields
        if 'message' not in data:
            return jsonify({
                "error": "Missing required field: message"
            }), 400
        
        message = data['message'].strip()
        if not message:
            return jsonify({
                "error": "Message cannot be empty"
            }), 400
        
        # Get or create session ID
        session_id = data.get('session_id', str(uuid.uuid4()))
        
        logger.info(f"Processing chat request for session: {session_id}")
        logger.info(f"Message: {message[:100]}...")  # Log first 100 chars
        
        # Configure the medical system
        config = {"configurable": {"thread_id": session_id}}
        
        # Process the message through the medical extraction system
        result = medical_app.invoke({
            "messages": [
                {
                    "role": "user",
                    "content": message
                }
            ]
        }, config=config)
        
        # Extract the final response
        if result and "messages" in result and result["messages"]:
            final_message = result["messages"][-1]
            response_content = final_message.content
            
            # Determine if this was handled by medical or off-topic agent
            agent_used = None
            for msg in reversed(result["messages"]):
                if hasattr(msg, 'name') and msg.name:
                    agent_used = msg.name
                    break
            
            # Store session info
            active_sessions[session_id] = {
                "last_activity": datetime.now(timezone.utc).isoformat(),
                "message_count": len(result["messages"]),
                "agent_used": agent_used
            }
            
            return jsonify({
                "response": response_content,
                "session_id": session_id,
                "agent_used": agent_used,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message_count": len(result["messages"])
            }), 200
        else:
            logger.error("No response received from medical system")
            return jsonify({
                "error": "No response received from medical system"
            }), 500
            
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route('/api/extract', methods=['POST'])
def extract_medical_info():
    """
    Endpoint specifically for medical information extraction.
    
    Expected JSON payload:
    {
        "text": "Medical text to extract information from"
    }
    """
    try:
        if not request.is_json:
            return jsonify({
                "error": "Content-Type must be application/json"
            }), 400
        
        data = request.get_json()
        
        if 'text' not in data:
            return jsonify({
                "error": "Missing required field: text"
            }), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({
                "error": "Text cannot be empty"
            }), 400
        
        logger.info(f"Processing extraction request for text: {text[:100]}...")
        
        # Import the extraction function
        from backend.medical_extraction_system import extract_medical_information
        
        # Extract medical information
        extracted_info = extract_medical_information(text)
        
        return jsonify({
            "extracted_info": extracted_info,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing extraction request: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route('/api/diagnose', methods=['POST'])
def generate_diagnosis():
    """
    Endpoint specifically for diagnosis generation.
    
    Expected JSON payload:
    {
        "structured_info": "JSON string with extracted medical information"
    }
    """
    try:
        if not request.is_json:
            return jsonify({
                "error": "Content-Type must be application/json"
            }), 400
        
        data = request.get_json()
        
        if 'structured_info' not in data:
            return jsonify({
                "error": "Missing required field: structured_info"
            }), 400
        
        structured_info = data['structured_info']
        
        logger.info(f"Processing diagnosis request")
        
        # Import the diagnosis function
        from backend.medical_extraction_system import generate_diagnosis
        
        # Generate diagnosis
        diagnosis = generate_diagnosis(structured_info)
        
        return jsonify({
            "diagnosis": diagnosis,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing diagnosis request: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Get information about active sessions."""
    return jsonify({
        "active_sessions": len(active_sessions),
        "sessions": active_sessions
    }), 200

@app.route('/api/sessions/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a specific session."""
    if session_id in active_sessions:
        del active_sessions[session_id]
        return jsonify({
            "message": f"Session {session_id} deleted successfully"
        }), 200
    else:
        return jsonify({
            "error": f"Session {session_id} not found"
        }), 404

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Transcribe audio file using OpenAI Whisper.
    
    Expected form data:
    - audio: audio file (MP3, WAV, M4A, OGG, FLAC)
    """
    try:
        # Check if file is present in request
        if 'audio' not in request.files:
            return jsonify({
                "error": "No audio file provided"
            }), 400
        
        file = request.files['audio']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                "error": "No audio file selected"
            }), 400
        
        # Validate file extension
        allowed_extensions = {'mp3', 'wav', 'm4a', 'ogg', 'flac'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({
                "error": f"Invalid file type. Supported formats: {', '.join(allowed_extensions)}"
            }), 400
        
        # Check file size (max 25MB)
        max_size = 25 * 1024 * 1024  # 25MB
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset file pointer
        
        if file_size > max_size:
            return jsonify({
                "error": "File too large. Maximum size is 25MB"
            }), 400
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_ext}') as temp_file:
            file.save(temp_file.name)
            temp_filename = temp_file.name
        
        try:
            # Initialize OpenAI client
            client = openai.OpenAI()
            
            # Transcribe audio using Whisper
            with open(temp_filename, 'rb') as audio_file:
                transcription = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                    # No language parameter - preserve original language without translation
                )
            
            # Clean up temporary file
            os.unlink(temp_filename)
            
            return jsonify({
                "transcription": transcription.text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "filename": secure_filename(file.filename)
            }), 200
            
        except Exception as transcription_error:
            # Clean up temporary file on error
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)
            raise transcription_error
        
    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Failed to transcribe audio",
            "details": str(e)
        }), 500

@app.route('/api/transcribe-url', methods=['POST'])
def transcribe_audio_from_url():
    """
    Transcribe audio file from URL using OpenAI Whisper.
    
    Expected JSON payload:
    {
        "audio_url": "https://example.com/audio.mp3"
    }
    """
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                "error": "Content-Type must be application/json"
            }), 400
        
        data = request.get_json()
        audio_url = data.get('audio_url')
        
        if not audio_url:
            return jsonify({
                "error": "No audio URL provided"
            }), 400
        
        # Validate URL format
        try:
            parsed_url = urlparse(audio_url)
            if not parsed_url.scheme or not parsed_url.netloc:
                raise ValueError("Invalid URL format")
        except Exception:
            return jsonify({
                "error": "Invalid URL format"
            }), 400
        
        # Validate file extension
        allowed_extensions = {'mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'}
        url_path = parsed_url.path.lower()
        file_ext = None
        
        for ext in allowed_extensions:
            if f'.{ext}' in url_path:
                file_ext = ext
                break
        
        if not file_ext:
            return jsonify({
                "error": f"Invalid file type. Supported formats: {', '.join(allowed_extensions)}"
            }), 400
        
        # Download audio file
        try:
            logger.info(f"Downloading audio from URL: {audio_url}")
            response = requests.get(audio_url, timeout=30, stream=True)
            response.raise_for_status()
            
            # Check content length if available
            content_length = response.headers.get('content-length')
            if content_length:
                max_size = 25 * 1024 * 1024  # 25MB
                if int(content_length) > max_size:
                    return jsonify({
                        "error": "Audio file too large. Maximum size is 25MB"
                    }), 400
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to download audio from URL: {str(e)}")
            return jsonify({
                "error": f"Failed to download audio file: {str(e)}"
            }), 400
        
        # Create temporary file and save audio data
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_ext}') as temp_file:
            for chunk in response.iter_content(chunk_size=8192):
                temp_file.write(chunk)
            temp_filename = temp_file.name
        
        try:
            # Initialize OpenAI client
            client = openai.OpenAI()
            
            # Transcribe audio using Whisper
            with open(temp_filename, 'rb') as audio_file:
                transcription = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                    # No language parameter - preserve original language without translation
                )
            
            # Clean up temporary file
            os.unlink(temp_filename)
            
            return jsonify({
                "transcription": transcription.text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source_url": audio_url
            }), 200
            
        except Exception as transcription_error:
            # Clean up temporary file on error
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)
            raise transcription_error
        
    except Exception as e:
        logger.error(f"Error transcribing audio from URL: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Failed to transcribe audio from URL",
            "details": str(e)
        }), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get system status and information."""
    return jsonify({
        "status": "running",
        "model": "gpt-4o-mini",
        "active_sessions": len(active_sessions),
        "endpoints": [
            "/health",
            "/api/chat",
            "/api/extract", 
            "/api/diagnose",
            "/api/transcribe",
            "/api/transcribe-url",
            "/api/sessions",
            "/api/status"
        ],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint not found",
        "available_endpoints": [
            "/health",
            "/api/chat",
            "/api/extract",
            "/api/diagnose", 
            "/api/sessions",
            "/api/status"
        ]
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "Internal server error"
    }), 500

if __name__ == '__main__':
    # Check if OpenAI API key is set
    if not os.getenv('OPENAI_API_KEY'):
        logger.warning("OPENAI_API_KEY environment variable not set")
    
    logger.info("Starting Medical Information Extraction API...")
    logger.info("Available endpoints:")
    logger.info("  GET  /health - Health check")
    logger.info("  POST /api/chat - Main chat interface")
    logger.info("  POST /api/extract - Extract medical information")
    logger.info("  POST /api/diagnose - Generate diagnosis")
    logger.info("  GET  /api/sessions - Get active sessions")
    logger.info("  GET  /api/status - Get system status")
    
    app.run(debug=True, host='0.0.0.0', port=5000)