#!/bin/bash

# Cleanup script for MediaPackage Proxy from EKS
set -e

echo "Cleaning up MediaPackage Proxy from EKS..."

# Delete resources in reverse order
echo "Deleting HPA..."
kubectl delete -f k8s/hpa.yaml --ignore-not-found=true

echo "Deleting Ingress..."
kubectl delete -f k8s/ingress.yaml --ignore-not-found=true

echo "Deleting Service..."
kubectl delete -f k8s/service.yaml --ignore-not-found=true

echo "Deleting Deployment..."
kubectl delete -f k8s/deployment.yaml --ignore-not-found=true

echo "Deleting ConfigMap..."
kubectl delete -f k8s/configmap.yaml --ignore-not-found=true

echo "Deleting Namespace..."
kubectl delete -f k8s/namespace.yaml --ignore-not-found=true

echo "Cleanup completed successfully!"


