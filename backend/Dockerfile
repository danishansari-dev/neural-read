FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Command to run (port is provided by Railway)
CMD uvicorn main:app --host 0.0.0.0 --port $PORT