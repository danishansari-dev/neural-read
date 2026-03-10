#!/bin/bash
cd "$(dirname "$0")" || cd backend
source venv/bin/activate 2>/dev/null || python -m venv venv && source venv/bin/activate
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000
