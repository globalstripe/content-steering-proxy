#!/bin/bash

# Deploy script for MediaPackage Proxy to EKS
set -e

echo "Deploying MediaPackage Proxy to EKS..."

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: kubectl is not configured or cluster is not accessible"
    exit 1
fi

# Apply Kubernetes manifests
echo "Creating namespace..."
kubectl apply -f k8s/namespace.yaml

echo "Creating ConfigMap..."
kubectl apply -f k8s/configmap.yaml

echo "Creating Deployment..."
kubectl apply -f k8s/deployment.yaml

echo "Creating Service..."
kubectl apply -f k8s/service.yaml

echo "Creating Ingress..."
kubectl apply -f k8s/ingress.yaml

echo "Creating HPA..."
kubectl apply -f k8s/hpa.yaml

echo "Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/mediapackage-proxy -n mediapackage-proxy

echo "Deployment completed successfully!"

# Show status
echo "Deployment status:"
kubectl get pods -n mediapackage-proxy
kubectl get services -n mediapackage-proxy
kubectl get ingress -n mediapackage-proxy

echo "To check logs: kubectl logs -f deployment/mediapackage-proxy -n mediapackage-proxy"
echo "To check health: kubectl port-forward service/mediapackage-proxy-service 8081:80 -n mediapackage-proxy"


