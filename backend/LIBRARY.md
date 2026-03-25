# Backend Library Guide

This document lists the key Python libraries used in the **SwasthaLink** backend and what they do. It is meant to help contributors quickly understand the stack.

## Core framework

- **fastapi** – Main web framework used to build the HTTP API.
- **uvicorn[standard]** – ASGI server used to run the FastAPI app in development and production.

## Configuration and typing

- **python-dotenv** – Loads environment variables from `.env` files.
- **pydantic** – Data validation and settings management for request/response models.

## AI / Gemini

- **google-generativeai** – Google Gemini SDK used to call the Gemini models for:
  - Discharge summary simplification
  - Bengali quality validation
  - OCR text extraction (Vision)

Implementation lives in `backend/gemini_service.py`.

## Messaging (WhatsApp)

- **twilio** – Twilio SDK used to send WhatsApp messages with simplified discharge summaries.

Implementation lives in `backend/twilio_service.py`.

## Database / Analytics

- **supabase** – Official Supabase Python client used for:
  - Storing session metadata and analytics
  - Persisting full session history and timeline events

Implementation lives in `backend/supabase_service.py`.

## Storage

- **boto3** – AWS SDK for Python used to upload and manage files in S3 (e.g., discharge summary uploads, OCR inputs).

Implementation lives in `backend/s3_service.py`.

## HTTP client

- **httpx** – HTTP client used internally by some of the above libraries (and available if we need to make outbound HTTP calls).

## Uploads and multipart

- **python-multipart** – Supports file upload handling in FastAPI endpoints (e.g., `/api/upload`).

---

If you add or remove a backend dependency in `requirements.txt`, please also update this `LIBRARY.md` so other contributors can keep track of the stack.