#!/bin/bash
set -e

ZITADEL_URL="http://zitadel:8080"
TOKEN_FILE="/shared/setup-token.txt"

echo "Waiting for Zitadel to generate setup token..."
until [ -f "$TOKEN_FILE" ]; do
    printf '.'
    sleep 2
done

AUTH_TOKEN=$(cat "$TOKEN_FILE")
echo "Setup token found!"

echo "Waiting for Zitadel to be healthy..."
until $(curl --output /dev/null --silent --head --fail -H "Host: localhost" "$ZITADEL_URL/debug/healthz"); do
    printf '.'
    sleep 2
done
echo "Zitadel is up!"

# Give Zitadel a bit more time to warm up its internal gRPC gateway
echo "Waiting 15 seconds for internal services to warm up..."
sleep 15

# 1. Create Project
echo "Creating Project..."
MAX_API_RETRIES=5
RETRY_COUNT=0
PROJECT_ID="null"

while [ "$PROJECT_ID" == "null" ] && [ $RETRY_COUNT -lt $MAX_API_RETRIES ]; do
    PROJECT_RES=$(curl -s -X POST "$ZITADEL_URL/management/v1/projects" \
        -H "Host: localhost" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name": "Scapegoat"}')
    
    PROJECT_ID=$(echo "$PROJECT_RES" | jq -r .id)
    ERR_CODE=$(echo "$PROJECT_RES" | jq -r .code)
    
    if [ "$ERR_CODE" == "6" ]; then
        echo "Project already exists. Searching for ID..."
        SEARCH_RES=$(curl -s -X POST "$ZITADEL_URL/management/v1/projects/_search" \
            -H "Host: localhost" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"queries": [{"nameQuery": {"name": "Scapegoat", "method": "TEXT_QUERY_METHOD_EQUALS"}}]}')
        PROJECT_ID=$(echo "$SEARCH_RES" | jq -r '.result[0].id')
        break
    fi

    if [ "$PROJECT_ID" == "null" ] || [ -z "$PROJECT_ID" ]; then
        echo "Project creation failed (Attempt $((RETRY_COUNT+1))). Response: $PROJECT_RES"
        echo "Retrying in 5 seconds..."
        sleep 5
        RETRY_COUNT=$((RETRY_COUNT+1))
    fi
done

if [ "$PROJECT_ID" == "null" ] || [ -z "$PROJECT_ID" ]; then
    echo "Failed to acquire Project ID."
    exit 1
fi

echo "Project ID: $PROJECT_ID"

# 2. Create OIDC App
echo "Creating Frontend App..."
RETRY_COUNT=0
CLIENT_ID="null"

while [ "$CLIENT_ID" == "null" ] && [ $RETRY_COUNT -lt $MAX_API_RETRIES ]; do
    APP_RES=$(curl -s -X POST "$ZITADEL_URL/management/v1/projects/$PROJECT_ID/apps/oidc" \
        -H "Host: localhost" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Scapegoat Frontend",
            "redirectUris": ["http://localhost:5173/callback"],
            "postLogoutRedirectUris": ["http://localhost:5173"],
            "responseTypes": ["OIDC_RESPONSE_TYPE_CODE"],
            "grantTypes": ["OIDC_GRANT_TYPE_AUTHORIZATION_CODE"],
            "authMethodType": "OIDC_AUTH_METHOD_TYPE_NONE",
            "version": "OIDC_VERSION_1_1",
            "devMode": true
        }')

    CLIENT_ID=$(echo "$APP_RES" | jq -r .clientId)
    ERR_CODE=$(echo "$APP_RES" | jq -r .code)

    if [ "$ERR_CODE" == "6" ]; then
        echo "App already exists. Searching for Client ID..."
        APP_SEARCH_RES=$(curl -s -X POST "$ZITADEL_URL/management/v1/projects/$PROJECT_ID/apps/_search" \
            -H "Host: localhost" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"queries": [{"nameQuery": {"name": "Scapegoat Frontend", "method": "TEXT_QUERY_METHOD_EQUALS"}}]}')
        CLIENT_ID=$(echo "$APP_SEARCH_RES" | jq -r '.result[0].oidcConfig.clientId')
        break
    fi

    if [ "$CLIENT_ID" == "null" ] || [ -z "$CLIENT_ID" ]; then
        echo "App creation failed (Attempt $((RETRY_COUNT+1))). Response: $APP_RES"
        echo "Retrying in 5 seconds..."
        sleep 5
        RETRY_COUNT=$((RETRY_COUNT+1))
    fi
done

echo "Found Client ID: $CLIENT_ID"

# Save configuration to shared .env file for both backend and frontend
ENV_FILE="/shared/.env"
echo "VITE_ZITADEL_CLIENT_ID=$CLIENT_ID" > "$ENV_FILE"
echo "ZITADEL_CLIENT_ID=$CLIENT_ID" >> "$ENV_FILE"
echo "VITE_ZITADEL_AUTHORITY=http://localhost:8080" >> "$ENV_FILE"
echo "VITE_API_URL=http://localhost:8081" >> "$ENV_FILE"

# Generate env-config.js for frontend runtime configuration
echo "window._env_ = { \"VITE_ZITADEL_CLIENT_ID\": \"$CLIENT_ID\", \"VITE_ZITADEL_AUTHORITY\": \"http://localhost:8080\", \"VITE_API_URL\": \"http://localhost:8081\" };" > /shared/env-config.js

echo "Setup Complete!"
