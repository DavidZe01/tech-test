import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../styles/SystemStatus.css';

const SystemStatus = ({ systemStatus, isConnected, onRefresh }) => {
  const [sessions, setSessions] = useState(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (isConnected) {
      loadSessions();
    }
  }, [isConnected]);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const response = await apiService.getSessions();
      setSessions(response);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      await apiService.deleteSession(sessionId);
      await loadSessions(); // Refresh sessions list
      await onRefresh(); // Refresh system status
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert(`Failed to delete session: ${error.message}`);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatUptime = (timestamp) => {
    const now = new Date();
    const start = new Date(timestamp);
    const diffMs = now - start;
    
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="system-status">
      <div className="status-header">
        <h2>📊 System Status</h2>
        <button onClick={onRefresh} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      {/* Connection Status */}
      <div className="status-section">
        <h3>🔗 Connection Status</h3>
        <div className={`connection-card ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="connection-indicator">
            {isConnected ? '🟢' : '🔴'}
          </div>
          <div className="connection-details">
            <h4>{isConnected ? 'Backend Connected' : 'Backend Disconnected'}</h4>
            <p>
              {isConnected 
                ? 'Successfully connected to Flask backend' 
                : 'Unable to connect to backend server'
              }
            </p>
            {!isConnected && (
              <div className="connection-help">
                <p>Make sure the backend is running:</p>
                <code>python flask_backend.py</code>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Information */}
      {isConnected && systemStatus && (
        <div className="status-section">
          <h3>⚙️ System Information</h3>
          <div className="info-grid">
            <div className="info-card">
              <h4>🤖 AI Model</h4>
              <p>{systemStatus.model}</p>
            </div>
            <div className="info-card">
              <h4>📈 Status</h4>
              <p className="status-running">{systemStatus.status}</p>
            </div>
            <div className="info-card">
              <h4>🕐 Last Updated</h4>
              <p>{formatTimestamp(lastUpdated)}</p>
            </div>
            <div className="info-card">
              <h4>👥 Active Sessions</h4>
              <p>{systemStatus.active_sessions}</p>
            </div>
          </div>
        </div>
      )}

      {/* Available Endpoints */}
      {isConnected && systemStatus && (
        <div className="status-section">
          <h3>🛠️ Available Endpoints</h3>
          <div className="endpoints-list">
            {systemStatus.endpoints && systemStatus.endpoints.map((endpoint, index) => (
              <div key={index} className="endpoint-item">
                <code>{endpoint}</code>
                <span className="endpoint-status">✅ Available</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Sessions */}
      {isConnected && (
        <div className="status-section">
          <h3>👥 Active Sessions</h3>
          <div className="sessions-header">
            <button 
              onClick={loadSessions} 
              disabled={isLoadingSessions}
              className="load-sessions-button"
            >
              {isLoadingSessions ? '⏳ Loading...' : '🔄 Refresh Sessions'}
            </button>
          </div>
          
          {sessions && (
            <div className="sessions-container">
              <div className="sessions-summary">
                <p>Total Active Sessions: <strong>{sessions.active_sessions}</strong></p>
              </div>
              
              {sessions.sessions && Object.keys(sessions.sessions).length > 0 ? (
                <div className="sessions-list">
                  {Object.entries(sessions.sessions).map(([sessionId, sessionData]) => (
                    <div key={sessionId} className="session-card">
                      <div className="session-header">
                        <h4>Session: {sessionId.slice(0, 8)}...</h4>
                        <button 
                          onClick={() => handleDeleteSession(sessionId)}
                          className="delete-session-button"
                          title="Delete Session"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="session-details">
                        <p><strong>Agent Used:</strong> {sessionData.agent_used || 'N/A'}</p>
                        <p><strong>Messages:</strong> {sessionData.message_count}</p>
                        <p><strong>Last Activity:</strong> {formatTimestamp(sessionData.last_activity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-sessions">
                  <p>No active sessions found</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* System Health Metrics */}
      {isConnected && (
        <div className="status-section">
          <h3>💚 Health Metrics</h3>
          <div className="health-metrics">
            <div className="metric-item">
              <span className="metric-label">Backend Response</span>
              <span className="metric-value good">✅ Healthy</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">API Endpoints</span>
              <span className="metric-value good">✅ All Available</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">AI Model</span>
              <span className="metric-value good">✅ GPT-4o-mini</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatus;