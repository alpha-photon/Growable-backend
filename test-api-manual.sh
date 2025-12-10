#!/bin/bash

# Manual API Testing - Test each endpoint one by one
BASE_URL="http://localhost:8000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Manual API Testing${NC}"
echo -e "${BLUE}Make sure server is running: npm run dev${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Generate unique email
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@example.com"

echo -e "${YELLOW}Using test email: $TEST_EMAIL${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}[1/13] Testing: GET /health${NC}"
curl -s http://localhost:8000/health | jq '.' || echo "Response received"
echo -e "\n"

# Test 2: Register User
echo -e "${YELLOW}[2/13] Testing: POST /api/auth/register${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test User\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"parent\"
  }")
echo "$REGISTER_RESPONSE" | jq '.' || echo "$REGISTER_RESPONSE"
TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo -e "\n"

# Test 3: Register with invalid data
echo -e "${YELLOW}[3/13] Testing: POST /api/auth/register (invalid email)${NC}"
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "invalid-email",
    "password": "password123"
  }' | jq '.' || echo "Response received"
echo -e "\n"

# Test 4: Login
echo -e "${YELLOW}[4/13] Testing: POST /api/auth/login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"password123\"
  }")
echo "$LOGIN_RESPONSE" | jq '.' || echo "$LOGIN_RESPONSE"
if [ -z "$TOKEN" ]; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi
echo -e "\n"

# Test 5: Login with wrong password
echo -e "${YELLOW}[5/13] Testing: POST /api/auth/login (wrong password)${NC}"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"wrongpassword\"
  }" | jq '.' || echo "Response received"
echo -e "\n"

# Test 6: Get Current User
echo -e "${YELLOW}[6/13] Testing: GET /api/auth/me${NC}"
if [ ! -z "$TOKEN" ]; then
    curl -s -X GET "$BASE_URL/auth/me" \
      -H "Authorization: Bearer $TOKEN" | jq '.' || echo "Response received"
else
    echo -e "${RED}No token available${NC}"
fi
echo -e "\n"

# Test 7: Get Current User without token
echo -e "${YELLOW}[7/13] Testing: GET /api/auth/me (without token)${NC}"
curl -s -X GET "$BASE_URL/auth/me" | jq '.' || echo "Response received"
echo -e "\n"

# Test 8: Create Post
echo -e "${YELLOW}[8/13] Testing: POST /api/posts${NC}"
if [ ! -z "$TOKEN" ]; then
    POST_RESPONSE=$(curl -s -X POST "$BASE_URL/posts" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "My Success Story with Autism Support",
        "content": "This is my personal success story about supporting my child with autism. We have made great progress over the past year with consistent therapy and support.",
        "category": "success-story",
        "tags": ["autism", "parenting"],
        "specialNeeds": ["autism"]
      }')
    echo "$POST_RESPONSE" | jq '.' || echo "$POST_RESPONSE"
    POST_ID=$(echo "$POST_RESPONSE" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
else
    echo -e "${RED}No token available${NC}"
fi
echo -e "\n"

# Test 9: Create Post with validation error
echo -e "${YELLOW}[9/13] Testing: POST /api/posts (short title - should fail)${NC}"
if [ ! -z "$TOKEN" ]; then
    curl -s -X POST "$BASE_URL/posts" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "Short",
        "content": "This is a test post content with enough characters to pass validation requirements.",
        "category": "tips"
      }' | jq '.' || echo "Response received"
else
    echo -e "${RED}No token available${NC}"
fi
echo -e "\n"

# Test 10: Get Posts
echo -e "${YELLOW}[10/13] Testing: GET /api/posts${NC}"
curl -s -X GET "$BASE_URL/posts" | jq '.' || echo "Response received"
echo -e "\n"

# Test 11: Get Single Post
if [ ! -z "$POST_ID" ]; then
    echo -e "${YELLOW}[11/13] Testing: GET /api/posts/$POST_ID${NC}"
    curl -s -X GET "$BASE_URL/posts/$POST_ID" | jq '.' || echo "Response received"
    echo -e "\n"
fi

# Test 12: Create Comment
if [ ! -z "$POST_ID" ] && [ ! -z "$TOKEN" ]; then
    echo -e "${YELLOW}[12/13] Testing: POST /api/comments${NC}"
    curl -s -X POST "$BASE_URL/comments" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"postId\": \"$POST_ID\",
        \"content\": \"This is a great post! Thank you for sharing your experience.\"
      }" | jq '.' || echo "Response received"
    echo -e "\n"
fi

# Test 13: Get Comments
if [ ! -z "$POST_ID" ]; then
    echo -e "${YELLOW}[13/13] Testing: GET /api/comments/post/$POST_ID${NC}"
    curl -s -X GET "$BASE_URL/comments/post/$POST_ID" | jq '.' || echo "Response received"
    echo -e "\n"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All Tests Completed!${NC}"
echo -e "${GREEN}========================================${NC}"

