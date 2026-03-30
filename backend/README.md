# SwasthaLink Backend Services

This README provides comprehensive instructions for setting up and running all backend services for the SwasthaLink application. The backend is built with Python FastAPI and integrates multiple services including AI processing, messaging, database storage, and cloud storage.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Services Overview](#services-overview)
- [API Endpoints](#api-endpoints)
- [Health Monitoring](#health-monitoring)
- [Rate Limiting](#rate-limiting)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Python 3.8+
- pip (Python package installer)
- Virtual environment tool (venv or virtualenv)
- Accounts with the following services:
  - Google AI Studio (for Gemini API key)
  - Twilio (for WhatsApp messaging)
  - Supabase (for database)
  - AWS (for S3 storage - optional)

## Project Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── models.py               # Pydantic models for request/response validation
├── prompts.py              # Prompt templates for AI processing
├── auth_service.py         # Authentication service
├── gemini_service.py       # Google Gemini AI integration
├── twilio_service.py       # Twilio WhatsApp messaging
├── supabase_service.py     # Supabase database integration
├── s3_service.py           # AWS S3 file storage
├── rate_alert_service.py   # Rate limiting and monitoring
├── prescription_rag_service.py  # Prescription RAG pipeline
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
└── .env                   # Your local environment variables (gitignored)
```

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual credentials:
   ```bash
   # Required: Google Gemini API
   GEMINI_API_KEY=your_actual_gemini_api_key

   # Required: Twilio WhatsApp API
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token

   # Required: Supabase API
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_supabase_anon_key

   # Optional: AWS S3 (for file uploads)
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_REGION=your_preferred_region
   S3_BUCKET_NAME=your_bucket_name
   ```

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

### Development Mode

To run the application in development mode with auto-reload:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or using the Python module approach:
```bash
python main.py
```

### Production Mode

For production deployment, use:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Environment Variables for Running

Ensure these key environment variables are set:
```bash
# App configuration
ENVIRONMENT=production
DEBUG=false
PORT=8000

# Frontend URL for CORS
FRONTEND_URL=https://yourdomain.com
```

## Services Overview

The backend integrates multiple services that work together seamlessly:

### 1. Google Gemini AI Service (`gemini_service.py`)
- Processes medical discharge summaries
- Performs OCR on uploaded documents
- Extracts structured data from prescriptions

### 2. Twilio WhatsApp Service (`twilio_service.py`)
- Sends simplified summaries via WhatsApp
- Handles message delivery status

### 3. Supabase Database Service (`supabase_service.py`)
- Stores session metadata and analytics
- Manages user authentication
- Tracks prescription records

### 4. AWS S3 Service (`s3_service.py`)
- Stores uploaded documents securely
- Implements auto-delete policies

### 5. Rate Alert Service (`rate_alert_service.py`)
- Monitors API usage across all services
- Provides alerts before hitting rate limits

### 6. Prescription RAG Service (`prescription_rag_service.py`)
- Processes handwritten prescriptions
- Implements admin approval workflow

## API Endpoints

Once running, access the API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

Key endpoints:
- `POST /api/process` - Process discharge summary
- `POST /api/send-whatsapp` - Send summary via WhatsApp
- `POST /api/upload` - Upload document for OCR
- `GET /api/health` - Health check for all services
- `POST /api/prescriptions/extract` - Extract prescription data
- `GET /api/prescriptions/pending` - List pending prescriptions

## Health Monitoring

Monitor the health of all integrated services:
```bash
curl http://localhost:8000/api/health
```

The health endpoint checks:
- Gemini API connectivity
- Twilio service status
- Supabase database connectivity
- AWS S3 bucket access

## Rate Limiting

The application implements proactive rate limiting:
- Tracks usage of all external services
- Provides warnings before hitting limits
- Can send alerts via email or GitHub issues

Configure in `.env`:
```bash
RATE_ALERTS_ENABLED=true
RATE_ALERT_THRESHOLD_PERCENT=80
RATE_ALERT_GEMINI_DAILY_LIMIT=1000
RATE_ALERT_TWILIO_DAILY_LIMIT=500
```

## Troubleshooting

### Common Issues

1. **Module not found errors**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment variables not loading**:
   Ensure `.env` file exists in the backend directory and contains all required variables.

3. **Port already in use**:
   Change the port in `.env` or use a different port:
   ```bash
   uvicorn main:app --port 8001
   ```

4. **Permission denied on Windows**:
   Run the terminal as Administrator if facing permission issues.

### Service-Specific Issues

#### Gemini API Issues
- Verify API key validity
- Check quota in Google AI Studio
- Ensure internet connectivity

#### Twilio Issues
- Confirm account SID and auth token
- Verify WhatsApp sandbox setup
- Check Twilio account balance

#### Supabase Issues
- Confirm URL and key are correct
- Check Supabase service status
- Verify database tables exist

#### AWS S3 Issues
- Confirm credentials have proper permissions
- Check bucket region matches configuration
- Verify bucket policy allows required actions

### Logs and Debugging

Enable debug mode in `.env`:
```bash
DEBUG=true
```

View logs:
```bash
# When running with uvicorn
tail -f uvicorn.log

# Or check system logs
journalctl -u your-app-name
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all services still work together
5. Submit a pull request

## Support

For issues with running the backend services, check:
1. All environment variables are correctly set
2. Internet connectivity to all external services
3. Service quotas and limitations
4. Application logs for specific error messages