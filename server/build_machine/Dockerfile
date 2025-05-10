# Use Python base image
FROM python:3.13-slim

WORKDIR /app

# Install Node.js and tree
RUN apt-get update && apt-get install -y \
    curl \
    tree \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install genezio CLI
RUN npm install -g genezio@3.2.9

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 8081

# Command to run the application
CMD ["python", "app.py"]
