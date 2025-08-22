import axios from 'axios';

// API base URL - adjust if backend is running on different port
const API_BASE_URL = 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // No timeout - allow long-running medical analysis requests
});

// API service functions
export const apiService = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  },

  // Main chat endpoint
  sendChatMessage: async (message, sessionId = null) => {
    try {
      const payload = { message };
      if (sessionId) {
        payload.session_id = sessionId;
      }
      
      const response = await api.post('/api/chat', payload);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Chat request failed: ${error.response.data.error || error.message}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  },

  // Extract medical information
  extractMedicalInfo: async (text) => {
    try {
      const response = await api.post('/api/extract', { text });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Extraction failed: ${error.response.data.error || error.message}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  },

  // Generate diagnosis
  generateDiagnosis: async (structuredInfo) => {
    try {
      const response = await api.post('/api/diagnose', { 
        structured_info: structuredInfo 
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Diagnosis generation failed: ${error.response.data.error || error.message}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  },

  // Get active sessions
  getSessions: async () => {
    try {
      const response = await api.get('/api/sessions');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get sessions: ${error.message}`);
    }
  },

  // Delete session
  deleteSession: async (sessionId) => {
    try {
      const response = await api.delete(`/api/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Failed to delete session: ${error.response.data.error || error.message}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  },

  // Transcribe audio from URL using Whisper
  transcribeAudioFromUrl: async (audioUrl) => {
    try {
      const response = await api.post('/api/transcribe-url', { 
        audio_url: audioUrl 
      }, {
        timeout: 120000, // 2 minutes timeout for audio URL processing
      });
      
      return response.data.transcription;
    } catch (error) {
      if (error.response) {
        throw new Error(`Audio transcription failed: ${error.response.data.error || error.message}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  },

  // Get system status
  getStatus: async () => {
    try {
      const response = await api.get('/api/status');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get system status: ${error.message}`);
    }
  }
};

// Request interceptor for logging (development only)
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(
    (config) => {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('❌ API Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for logging
  api.interceptors.response.use(
    (response) => {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error('❌ API Response Error:', error.response?.status, error.message);
      return Promise.reject(error);
    }
  );
}

export default apiService;