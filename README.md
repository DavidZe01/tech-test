# Medical Information Extraction System (Tech Test)

A comprehensive AI-powered medical information extraction and diagnosis system built with LangChain, LangGraph, Flask, and React. This system enables healthcare professionals and researchers to extract structured medical information from free text and generate evidence-based diagnoses and treatment recommendations.

## 🏥 Overview

The Medical Information Extraction System is designed to transform unstructured medical text into actionable medical insights. The system employs a sophisticated multi-agent architecture that can intelligently route queries between medical and non-medical contexts, ensuring accurate and relevant responses.

### Key Features

- **🤖 Multi-Agent Architecture**: Supervised agent system with specialized medical and off-topic agents
- **📋 Structured Information Extraction**: Extract patient demographics, symptoms, and consultation reasons from free text
- **🩺 AI-Powered Diagnosis**: Generate comprehensive diagnoses, treatment plans, and medical recommendations
- **💬 Interactive Chat Interface**: Real-time conversation with medical AI agents
- **🎤 Audio Transcription**: URL-based audio transcription using OpenAI Whisper API
- **📊 System Monitoring**: Dashboard for tracking sessions and system health
- **🔄 Session Management**: Persistent conversation history and context
- **🎯 Pydantic Models**: Structured outputs

## 🏗️ System Architecture

### Backend Components

#### 1. Core Medical System (`medical_extraction_system.py`)
- **LangChain/LangGraph Implementation**: Advanced workflow orchestration with structured outputs
- **Supervised Multi-Agent System**: Intelligent routing between specialized agents
- **Medical Agent**: Handles medical queries with three specialized tools:
  - Structured information extraction using Pydantic models
  - AI-powered diagnosis and treatment plan generation
  - Medical data validation and formatting
- **Off-Topic Agent**: Manages non-medical queries with appropriate redirection
- **Memory Management**: Session-based conversation history with checkpointer and store
- **Smart Data Processing**: 
  - Automatic gender inference from patient names
  - Structured output validation with type safety
  - Consistent field display with "Not provided" defaults

#### 2. Flask REST API (`flask_backend.py`)
- **RESTful Endpoints**: Complete API for frontend integration
- **CORS Support**: Cross-origin resource sharing for web applications
- **Audio Transcription**: URL-based audio processing with OpenAI Whisper
- **Session Management**: UUID-based session tracking
- **Error Handling**: Comprehensive validation and error responses
- **Health Monitoring**: System status and metrics endpoints
- **File Processing**: Secure audio download and temporary file management

#### 3. Pydantic Data Models
```python
class PatientIdentification(BaseModel):
    name: Optional[str]
    age: Optional[int]
    identification_number: Optional[str]
    gender: Optional[str]
    phone: Optional[str]
    address: Optional[str]

class MedicalExtraction(BaseModel):
    symptoms: List[str]
    patient_info: PatientIdentification
    reason_for_consultation: str
```

### Frontend Components

#### 1. React Application (`frontend/`)
- **Modern React 18**: Functional components with hooks
- **Component Architecture**: Modular and reusable UI components
- **Responsive Design**: Mobile-first approach with CSS Grid/Flexbox
- **Real-time Communication**: API integration with error handling

#### 2. Key Components
- **ChatInterface**: Interactive medical chat with conversation history and audio transcription
- **MedicalExtraction**: Step-by-step information extraction workflow
- **SystemStatus**: Real-time monitoring dashboard
- **API Service Layer**: Centralized backend communication
- **Audio Integration**: URL-based audio transcription with modal interface
- **Notification System**: Temporary notifications for user feedback
- **Typography**: Professional "Mier A" font family implementation

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ (for frontend)
- **Python** 3.8+ (for backend)
- **OpenAI API Key** (required for AI functionality)

### Installation & Setup

1. **Clone and Navigate**
   ```bash
   cd tech-challenge
   ```

2. **Backend Setup**
   ```bash
   # Install Python dependencies
   pip install -r requirements.txt
   
   # Set OpenAI API key
   export OPENAI_API_KEY="your-openai-api-key-here"
   ```

3. **Frontend Setup**
   ```bash
   # Navigate to frontend directory
   cd frontend
   
   # Install Node.js dependencies
   npm install
   ```

4. **Start the System**
   
   **Terminal 1 - Backend:**
   ```bash
   # From backend directory
   cd backend
   python flask_backend.py
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   # From frontend directory
   cd frontend
   npm start
   ```

5. **Access the Application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5000
   - **Health Check**: http://localhost:5000/health

## 📡 API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | System health check |
| `POST` | `/api/chat` | Main chat interface |
| `POST` | `/api/extract` | Medical information extraction |
| `POST` | `/api/diagnose` | Diagnosis generation |
| `POST` | `/api/transcribe-url` | Audio transcription from URL |
| `GET` | `/api/sessions` | Active session management |
| `GET` | `/api/status` | System status and metrics |

### Example Usage

#### Chat Interface
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Patient John Doe, 35, severe headache and nausea for 3 days",
    "session_id": "session-123"
  }'
```

#### Medical Extraction
```bash
curl -X POST http://localhost:5000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Maria Rodriguez, 28, persistent cough and fever of 102°F"
  }'
```

#### Audio Transcription
```bash
curl -X POST http://localhost:5000/api/transcribe-url \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/medical-consultation.mp3"
  }'
```

### 🎤 Audio Transcription Feature

The system includes comprehensive audio transcription capabilities using OpenAI's Whisper API:

#### Supported Audio Formats
- MP3, WAV, M4A, OGG, FLAC, AAC
- Maximum file size: 25MB
- URL-based processing for remote audio files

#### How It Works
1. **URL Input**: Users provide a direct URL to an audio file
2. **Download & Validation**: System securely downloads and validates the audio
3. **Whisper Processing**: OpenAI Whisper transcribes the audio to text
4. **Auto-Processing**: Transcribed text is automatically sent to medical AI
5. **Medical Analysis**: Complete extraction and diagnosis pipeline

#### Test Audio Links
You can test the audio transcription feature with these sample medical audio files generated by AI:

*Note: The user will provide test audio URLs in this section*

```
- https://storage.googleapis.com/audios-test1/Audio1.mp3
- https://storage.googleapis.com/audios-test1/Audio2.mp3
- https://storage.googleapis.com/audios-test1/Audio3.mp3
- https://storage.googleapis.com/audios-test1/Audio4.mp3
```

## Smart Features

### Gender Inference System
The system intelligently infers patient gender from names when not explicitly provided:


#### Implementation
```python
# Automatic gender inference in extraction prompt
"For gender: If not explicitly mentioned, infer it from the patient's name 
(e.g., 'John' -> 'Male', 'Maria' -> 'Female'). 
Only use 'Not provided' if the name is ambiguous or not given"
```

### Structured Output Validation
- **Guaranteed Fields**: All 6 patient information fields always present
- **Type Safety**: Pydantic models ensure data consistency
- **Smart Defaults**: "Not provided" for missing data (except inferred gender)

## Design Decisions

### 1. Multi-Agent Architecture
**Decision**: Implemented supervised multi-agent system with LangGraph: 
- Enables intelligent routing between medical and non-medical queries
- Provides specialized tools for different medical tasks
- Maintains conversation context and history

### 2. Model Selection
**Decision**: GPT-4o-mini as the primary language model:
- Optimal balance between performance and cost-effectiveness
- Sufficient medical knowledge for extraction and diagnosis tasks
- Fast response times for interactive chat experience
- Reliable structured output generation

### 3. Structured Data Approach
**Decision**: Pydantic models with structured output and smart field inference:
- Type safety and data validation with `model.with_structured_output()`
- Consistent API responses with guaranteed field presence
- Automatic gender inference from patient names when not explicitly provided
- Easy serialization/deserialization with Pydantic models
- Clear documentation of data schemas

### 4. Separation of Concerns
**Decision**: Separate backend API and frontend application:
- Scalability and maintainability
- Technology flexibility (can swap frontend/backend independently)
- Clear API contract for integration
- Better testing and deployment strategies

### 5. Session Management
**Decision**: UUID-based session tracking with in-memory storage:
- Simple implementation for prototype/demo
- Maintains conversation context
- Easy to extend to persistent storage (Redis, PostgreSQL)
- Supports concurrent users

## 🔧 Technical Implementation

### Supervisor-Based AI Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 SUPERVISOR AGENT                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Route Decision Logic               │    │
│  │  • Analyzes incoming query                      │    │
│  │  • Determines medical vs off-topic              │    │
│  │  • Routes to appropriate specialist agent       │    │
│  │  • Manages conversation flow                    │    │
│  └─────────────┬───────────────┬───────────────────┘    │
└────────────────┼───────────────┼────────────────────────┘
                 │               │
    ┌────────────▼──────────┐   ┌▼─────────────────────┐
    │   MEDICAL EXPERT      │   │   OFF-TOPIC HANDLER  │
    │      AGENT            │   │        AGENT         │
    ├───────────────────────┤   ├──────────────────────┤
    │🔧 Specialized Tools:  │   │ 🔧 Tool:            │
    │                       │   │                      │
    │ 1. extract_medical_   │   │ • handle_offtopic_   │
    │    information()      │   │   query()            │
    │    • Pydantic models  │   │   • Polite redirect  │
    │    • Gender inference │   │   • Medical focus    │
    │    • Structured data  │   │     guidance         │
    │                       │   │                      │
    │ 2. generate_diagnosis │   └──────────────────────┘
    │    • Treatment plans  │
    │    • Recommendations  │
    │    • Medical analysis │
    │                       │
    │ 3. validate_medical_  │
    │    extraction()       │
    │    • Data validation  │
    │    • Type safety      │
    └───────────┬───────────┘
                │
    ┌───────────▼────────────────────────────────────────┐
    │              MEMORY SYSTEM                         │
    │  ┌──────────────────┐  ┌─────────────────────────┐ │
    │  │   Checkpointer   │  │      InMemoryStore      │ │
    │  │ • Session state  │  │  • Conversation history │ │
    │  │ • Thread tracking│  │  • Context persistence  │ │
    │  │ • State recovery │  │  • Multi-session mgmt   │ │
    │  └──────────────────┘  └─────────────────────────┘ │
    └────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────▼─────────────────────────┐
    │                      OUTPUT                       │
    │  • Medical knowledge processing                   │
    │  • Structured output generation                   │
    │  • Natural language understanding                 │
    │  • Context-aware responses                        │
    └───────────────────────────────────────────────────┘
```

**Key Architecture Features:**
- **Intelligent Routing**: Supervisor analyzes queries and routes to specialist agents
- **Tool Specialization**: Each agent has purpose-built tools for their domain
- **Memory Persistence**: Conversation context maintained across interactions
- **Structured Outputs**: Pydantic models ensure consistent data formatting
- **Error Isolation**: Failed tools don't break the entire conversation flow

### Frontend Architecture

```
┌─────────────────────┐
│    React App        │
├─────────────────────┤
│  • Component-based  │
│  • Responsive UI    │
│  • State management │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   API Service       │
├─────────────────────┤
│  • Axios client     │
│  • Error handling   │
│  • Type safety      │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   Backend API       │
└─────────────────────┘
```

### Data Flow

1. **User Input**: Medical text entered in chat interface
2. **API Request**: Frontend sends POST to `/api/chat`
3. **Agent Routing**: Supervisor determines medical vs off-topic
4. **Tool Execution**: Medical agent uses appropriate extraction/diagnosis tools
5. **Response Generation**: Structured response with medical insights
6. **Frontend Display**: Formatted response with markdown rendering

## 📁 Project Structure

```
tech-challenge/
├── backend/                        # Backend application
│   ├── medical_extraction_system.py  # Core LangChain/LangGraph system
│   └── flask_backend.py              # Flask REST API server
├── frontend/                       # React frontend application
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── ChatInterface.js    # Medical chat with audio transcription
│   │   │   └── SystemStatus.js     # Monitoring dashboard
│   │   ├── services/
│   │   │   └── api.js              # API service layer
│   │   ├── styles/                 # CSS styling with Mier A typography
│   │   │   ├── ChatInterface.css   # Chat interface styles
│   │   │   ├── App.css             # Global application styles
│   │   │   └── index.css           # Root styles
│   │   ├── App.js                  # Main application
│   │   └── index.js                # React entry point
│   ├── package.json                # Node.js dependencies
│   └── README.md                   # Frontend documentation
├── requirements.txt                # Python dependencies
└── README.md                       # This file (complete documentation)
```

## 🧪 Testing

### Backend Testing
```bash
# Manual health check
curl http://localhost:5000/health

# Test medical extraction with gender inference
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Patient Sarah Williams, age 45, severe chest pain"}'

# Test audio transcription (replace with actual audio URL)
curl -X POST http://localhost:5000/api/transcribe-url \
  -H "Content-Type: application/json" \
  -d '{"audio_url": "https://example.com/medical-audio.mp3"}'
```

### Frontend Testing
```bash
cd frontend
npm test
```

### Feature Testing
- **Gender Inference**: Test with names like "John", "Maria", "Alex" to see automatic gender assignment
- **Audio Transcription**: Use the microphone button to test URL-based audio processing
- **Structured Output**: Verify all 6 patient fields are consistently displayed