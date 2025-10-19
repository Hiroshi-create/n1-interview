#!/bin/bash

echo "Testing AI Marketer API..."

curl -X POST http://localhost:3003/api/ai-marketer/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": null,
    "themeId": "df7e6291-3d33-406e-8335-1742be5ed586",
    "themeName": "新製品開発のためのユーザーインタビュー",
    "userId": "test-user-123",
    "message": "新製品開発について教えてください",
    "context": {
      "focusArea": "general"
    }
  }' \
  --silent \
  | python3 -m json.tool