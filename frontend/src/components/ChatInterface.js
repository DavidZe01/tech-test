import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { apiService } from '../services/api';
import '../styles/ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [showAudioUrlModal, setShowAudioUrlModal] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [notification, setNotification] = useState(null);
  const [sessionId] = useState(() => uuidv4());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sample medical texts for quick testing
  const sampleTexts = [
    "Patient John Doe, age 35, ID: 12345678, came to the clinic complaining of severe headache, nausea, and dizziness that started 3 days ago. He reports difficulty concentrating and sensitivity to light.",
    "Maria Rodriguez, 28 years old, phone: 555-0123, presents with persistent cough, fever of 102°F, and shortness of breath. Symptoms began 5 days ago and have progressively worsened.",
    "Patient Sarah Johnson, age 42, came to the emergency room complaining of severe chest pain, shortness of breath, and sweating that started 2 hours ago. Pain radiates to her left arm."
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show temporary notification
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3000); // Hide after 3 seconds
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: uuidv4(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Send message to backend
      const response = await apiService.sendChatMessage(userMessage.content, sessionId);
      
      // Add AI response to chat
      const aiMessage = {
        id: uuidv4(),
        type: 'ai',
        content: response.response,
        agentUsed: response.agent_used,
        timestamp: new Date(),
        sessionId: response.session_id
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage = {
        id: uuidv4(),
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const insertSampleText = (text) => {
    setInputMessage(text);
    inputRef.current?.focus();
  };

  const validateAudioUrl = (url) => {
    try {
      new URL(url);
      // Check if URL ends with audio file extensions
      const audioExtensions = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'];
      const urlPath = new URL(url).pathname.toLowerCase();
      return audioExtensions.some(ext => urlPath.includes(`.${ext}`));
    } catch {
      return false;
    }
  };

  const handleAudioUrlSubmit = async () => {
    if (!audioUrl.trim()) {
      alert('Please enter an audio URL');
      return;
    }

    if (!validateAudioUrl(audioUrl)) {
      alert('Please enter a valid audio URL (MP3, WAV, M4A, OGG, FLAC, AAC)');
      return;
    }

    setIsProcessingAudio(true);
    setShowAudioUrlModal(false);
    
    try {
      // Add processing message
      const processingMessage = {
        id: uuidv4(),
        type: 'system',
        content: `Processing audio from URL: ${audioUrl}...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, processingMessage]);

      // Transcribe audio from URL
      const transcribedText = await apiService.transcribeAudioFromUrl(audioUrl);
      
      // Remove processing message
      setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
      
      // Show temporary notification
      showNotification("Transcription completed");

      // Create user message with transcribed text
      const userMessage = {
        id: uuidv4(),
        type: 'user',
        content: transcribedText,
        timestamp: new Date()
      };

      // Add user message to chat
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      // Automatically send transcribed text to AI
      const response = await apiService.sendChatMessage(transcribedText, sessionId);
      
      // Add AI response to chat
      const aiMessage = {
        id: uuidv4(),
        type: 'ai',
        content: response.response,
        agentUsed: response.agent_used,
        timestamp: new Date(),
        sessionId: response.session_id
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Audio transcription error:', error);
      
      // Remove processing message and add error message
      setMessages(prev => prev.filter(msg => msg.type !== 'system'));
      
      const errorMessage = {
        id: uuidv4(),
        type: 'error',
        content: `Error transcribing audio: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessingAudio(false);
      setIsLoading(false);
      setAudioUrl('');
      inputRef.current?.focus();
    }
  };

  const handleAudioButtonClick = () => {
    setShowAudioUrlModal(true);
  };

  const handleModalClose = () => {
    setShowAudioUrlModal(false);
    setAudioUrl('');
  };

  const handleUrlKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAudioUrlSubmit();
    } else if (e.key === 'Escape') {
      handleModalClose();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>💬 Medical Chat Assistant</h2>
        <div className="chat-controls">
          <span className="session-id">Session: {sessionId.slice(0, 8)}...</span>
          <button onClick={clearChat} className="clear-button" disabled={messages.length === 0}>
            Clear Chat
          </button>
        </div>
      </div>

      {/* Sample texts for quick testing */}
      {messages.length === 0 && (
        <div className="sample-texts">
          <h3>Quick Test Examples:</h3>
          {sampleTexts.map((text, index) => (
            <button
              key={index}
              className="sample-text-button"
              onClick={() => insertSampleText(text)}
            >
              <span className="example-label">Example {index + 1}:</span> {text.slice(0, 120)}{text.length > 120 ? '...' : ''}
            </button>
          ))}
          <div className="sample-offtopic">
            <button
              className="sample-text-button offtopic"
              onClick={() => insertSampleText("What's the weather like today?")}
            >
              <span className="example-label">🌤️ Off-topic Test:</span> What's the weather like today?
            </button>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-header">
              <span className="message-type">
                {message.type === 'user' ? '👤 You' : 
                 message.type === 'ai' ? `🤖 AI ${message.agentUsed ? `(${message.agentUsed})` : ''}` : 
                 message.type === 'system' ? '💡 System' :
                 '❌ Error'}
              </span>
              <span className="message-time">{formatTimestamp(message.timestamp)}</span>
            </div>
            <div className="message-content">
              {message.type === 'ai' ? (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai loading">
            <div className="message-header">
              <span className="message-type">🤖 AI</span>
              <span className="message-time"> Processing...</span>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          ref={inputRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter medical text or ask a question... (Press Enter to send, Shift+Enter for new line)"
          rows={3}
          disabled={isLoading || isProcessingAudio}
        />
        <div className="input-actions">
          <button 
            onClick={handleAudioButtonClick}
            disabled={isLoading || isProcessingAudio}
            className="audio-button"
            title="Transcribe audio from URL"
          >
            {isProcessingAudio ? '⏳' : '🎤'}
          </button>
          <button 
            onClick={handleSendMessage} 
            disabled={!inputMessage.trim() || isLoading || isProcessingAudio}
            className="send-button"
          >
            {isLoading ? '⏳' : '📤'} Send
          </button>
        </div>
      </div>

      {/* Audio URL Modal */}
      {showAudioUrlModal && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Enter Audio URL</h3>
              <button className="modal-close" onClick={handleModalClose}>×</button>
            </div>
            <div className="modal-body">
              <p>Please enter the URL of the audio file you want to transcribe:</p>
              <input
                type="url"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                onKeyDown={handleUrlKeyPress}
                placeholder="https://example.com/audio.mp3"
                className="url-input"
                autoFocus
              />
              <div className="supported-formats">
                <small>Supported formats: MP3, WAV, M4A, OGG, FLAC, AAC</small>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleModalClose} className="cancel-button">
                Cancel
              </button>
              <button 
                onClick={handleAudioUrlSubmit} 
                className="submit-button"
                disabled={!audioUrl.trim()}
              >
                Transcribe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Notification */}
      {notification && (
        <div className="notification">
          <div className="notification-content">
            <span className="notification-icon">✅</span>
            <span className="notification-text">{notification}</span>
          </div>
        </div>
      )}

      <div className="chat-info">
        <p>⚕️ Note: This is for the technical test purposes ONLY and should not replace a real and professional consultation.</p>
      </div>
    </div>
  );
};

export default ChatInterface;