#!/bin/bash

# Build and push script for MediaPackage Proxy
set -e

# Configuration
REGISTRY=${DOCKER_REGISTRY:-"your-registry.com"}
IMAGE_NAME="mediapackage-proxy"
TAG=${TAG:-"latest"}
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "Building Docker image: ${FULL_IMAGE_NAME}"

# Build the Docker image
docker build -t ${FULL_IMAGE_NAME} .

echo "Pushing Docker image to registry..."

# Push the image
docker push ${FULL_IMAGE_NAME}

echo "Image pushed successfully: ${FULL_IMAGE_NAME}"

# Update the deployment with the new image
echo "Updating deployment with new image..."
kubectl set image deployment/mediapackage-proxy mediapackage-proxy=${FULL_IMAGE_NAME} -n mediapackage-proxy

echo "Deployment updated successfully!"


