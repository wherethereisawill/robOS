FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    ffmpeg \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy training code
COPY . /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Hugging Face CLI login depends on having git config
RUN git config --global user.email "replicate@example.com" && \
    git config --global user.name "Replicate"

# Entry point
ENTRYPOINT ["python", "train.py"]