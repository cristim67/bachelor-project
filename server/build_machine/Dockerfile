# Use Python base image
FROM python:3.11-slim

# Install Node.js and tree
RUN apt-get update && apt-get install -y \
    curl \
    tree \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install genezio from specific branch
RUN git clone --branch fix-unref https://github.com/Genez-io/genezio.git /tmp/genezio \
    && cd /tmp/genezio \
    && npm install \
    && npm run install-locally-dev \
    && npm link \
    && cd /app \
    && export PATH=$PATH:/usr/local/bin \
    && which genezio \
    && genezio --version

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 8081

# Command to run the application
CMD ["python", "app.py"]
