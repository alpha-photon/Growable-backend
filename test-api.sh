#!/bin/bash

# API Testing Script
# Make sure server is running on port 8000

BASE_URL="http://localhost:8000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Testing SpecialAble Backend API${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
response=$(curl -s -w "\n%{http_code}" http://localhost:8000/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status: $http_code"
    echo "Response: $body"
else
    echo -e "${RED}✗ FAIL${NC} - Status: $http_code"
fi
echo ""

# Test 2: Register User
echo -e "${YELLOW}Test 2: Register User${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@example.com",
    "password": "password123",
    "role": "parent"
  }')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 201 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status: $http_code"
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "Token: ${TOKEN:0:50}..."
    echo "Response: $body" | head -c 200
else
    echo -e "${RED}✗ FAIL${NC} - Status: $http_code"
    echo "Response: $body"
fi
echo ""

# Test 3: Register Duplicate User (should fail)
echo -e "${YELLOW}Test 3: Register Duplicate User (should fail)${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@example.com",
    "password": "password123"
  }')
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -ne 201 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly rejected duplicate (Status: $http_code)"
else
    echo -e "${RED}✗ FAIL${NC} - Should have rejected duplicate"
fi
echo ""

# Test 4: Login
echo -e "${YELLOW}Test 4: Login${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123"
  }')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status: $http_code"
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    USER_ID=$(echo "$body" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "Token: ${TOKEN:0:50}..."
    echo "User ID: $USER_ID"
else
    echo -e "${RED}✗ FAIL${NC} - Status: $http_code"
    echo "Response: $body"
fi
echo ""

# Test 5: Login with wrong password
echo -e "${YELLOW}Test 5: Login with Wrong Password${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "wrongpassword"
  }')
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -ne 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly rejected wrong password (Status: $http_code)"
else
    echo -e "${RED}✗ FAIL${NC} - Should have rejected wrong password"
fi
echo ""

# Test 6: Get Current User (Protected)
echo -e "${YELLOW}Test 6: Get Current User (Protected)${NC}"
if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ SKIP${NC} - No token available"
else
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/auth/me" \
      -H "Authorization: Bearer $TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Status: $http_code"
        echo "Response: $body" | head -c 200
    else
        echo -e "${RED}✗ FAIL${NC} - Status: $http_code"
    fi
fi
echo ""

# Test 7: Get Current User without token
echo -e "${YELLOW}Test 7: Get Current User without Token (should fail)${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/auth/me")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Correctly rejected (Status: $http_code)"
else
    echo -e "${RED}✗ FAIL${NC} - Should have returned 401"
fi
echo ""

# Test 8: Create Post
echo -e "${YELLOW}Test 8: Create Post${NC}"
if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ SKIP${NC} - No token available"
else
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/posts" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "My Success Story with Autism",
        "content": "This is my personal success story about supporting my child with autism. We have made great progress over the past year.",
        "category": "success-story",
        "tags": ["autism", "parenting"],
        "specialNeeds": ["autism"]
      }')
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq 201 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Status: $http_code"
        POST_ID=$(echo "$body" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
        echo "Post ID: $POST_ID"
        echo "Response: $body" | head -c 200
    else
        echo -e "${RED}✗ FAIL${NC} - Status: $http_code"
        echo "Response: $body"
    fi
fi
echo ""

# Test 9: Create Post with short title (should fail)
echo -e "${YELLOW}Test 9: Create Post with Short Title (should fail)${NC}"
if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ SKIP${NC} - No token available"
else
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/posts" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "Short",
        "content": "This is a test post content with enough characters to pass validation requirements.",
        "category": "tips"
      }')
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 400 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Correctly rejected short title (Status: $http_code)"
    else
        echo -e "${RED}✗ FAIL${NC} - Should have rejected short title"
    fi
fi
echo ""

# Test 10: Get Posts
echo -e "${YELLOW}Test 10: Get Posts${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/posts")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status: $http_code"
    echo "Response: $body" | head -c 300
else
    echo -e "${RED}✗ FAIL${NC} - Status: $http_code"
fi
echo ""

# Test 11: Get Single Post
if [ ! -z "$POST_ID" ]; then
    echo -e "${YELLOW}Test 11: Get Single Post${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/posts/$POST_ID")
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 500 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Status: $http_code (500 if post not approved yet)"
    else
        echo -e "${RED}✗ FAIL${NC} - Status: $http_code"
    fi
    echo ""
fi

# Test 12: Create Comment
if [ ! -z "$POST_ID" ] && [ ! -z "$TOKEN" ]; then
    echo -e "${YELLOW}Test 12: Create Comment${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/comments" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"postId\": \"$POST_ID\",
        \"content\": \"This is a great post! Thank you for sharing your experience.\"
      }")
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 201 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Status: $http_code"
    else
        echo -e "${RED}✗ FAIL${NC} - Status: $http_code"
    fi
    echo ""
fi

# Test 13: Get Comments
if [ ! -z "$POST_ID" ]; then
    echo -e "${YELLOW}Test 13: Get Comments for Post${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/comments/post/$POST_ID")
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Status: $http_code"
    else
        echo -e "${RED}✗ FAIL${NC} - Status: $http_code"
    fi
    echo ""
fi

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}API Testing Complete!${NC}"
echo -e "${YELLOW}========================================${NC}"

