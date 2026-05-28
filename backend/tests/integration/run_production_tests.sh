#!/bin/bash

# Color codes for premium terminal UI
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

BACKEND_URL="https://cuong2004-medagen-exe.hf.space"
CV_URL="https://cuong2004-medagen-exe-worker.hf.space"

echo -e "${BOLD}${YELLOW}======================================================================"
echo -e "🔬 MEDAGEN V2 MASTER INTEGRATION TEST SUITE (PRODUCTION SERVERS)"
echo -e "======================================================================${NC}\n"

# Helper function to print header of a test case
print_case_header() {
    echo -e "${BOLD}${CYAN}------------------------------------------------------------"
    echo -e "📋 USE CASE $1: $2"
    echo -e "------------------------------------------------------------${NC}"
}

# 1. Backend Liveness Check
print_case_header "1" "Backend Liveness Probe Check (Liveness)"
echo -e "Requesting: GET ${BACKEND_URL}/"
response=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

# 2. Backend Health Check
print_case_header "2" "Backend System Status & LLM Provider Status"
echo -e "Requesting: GET ${BACKEND_URL}/health"
response=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

# 3. Swagger UI API Docs
print_case_header "3" "Swagger UI Interactive API Documentation"
echo -e "Requesting: GET ${BACKEND_URL}/docs"
response=$(curl -s -w "\n%{http_code}" -o /dev/null "${BACKEND_URL}/docs")
if [ "$response" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $response) - Swagger UI HTML is available${NC}\n"
else
    echo -e "${RED}FAILED (HTTP $response)${NC}\n"
fi

# 4. CV Worker Liveness
print_case_header "4" "CV Worker Service Liveness Probe"
echo -e "Requesting: GET ${CV_URL}/"
response=$(curl -s -w "\n%{http_code}" "${CV_URL}/")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

# 5. CV Worker Health
print_case_header "5" "CV Worker Models & RAM Status (Anti-GIL Verification)"
echo -e "Requesting: GET ${CV_URL}/health"
response=$(curl -s -w "\n%{http_code}" "${CV_URL}/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

# 6. Session Creation
print_case_header "6" "Public User Session Creation (Supabase Persisted)"
echo -e "Requesting: POST ${BACKEND_URL}/api/v1/sessions"
response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d '{"user_id": "master-verify-patient"}' "${BACKEND_URL}/api/v1/sessions")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
session_id=$(echo "$body" | grep -o '"session_id":"[^"]*' | grep -o '[^"]*$')
if [ "$http_code" -eq 201 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body"
    echo -e "Captured Session ID: ${YELLOW}$session_id${NC}\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

# 7. Emergency Triage (Text Only)
print_case_header "7" "Cardiovascular Emergency Triage (Text Only)"
echo -e "Requesting: POST ${BACKEND_URL}/api/v1/triage"
payload='{"user_id": "master-verify-patient", "text": "Tôi bị đau thắt ngực trái dữ dội như đá đè, lan ra cánh tay trái, vã mồ hôi lạnh và cực kỳ khó thở từ 10 phút trước."}'
response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$payload" "${BACKEND_URL}/api/v1/triage")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

# 8. Urgent Triage (Text Only)
print_case_header "8" "Dermatological Urgent Triage (Text Only)"
echo -e "Requesting: POST ${BACKEND_URL}/api/v1/triage"
payload='{"user_id": "master-verify-patient", "text": "Da mu bàn tay bị mẩn đỏ nổi nhiều mụn nước li ti ngứa ngáy dữ dội sau khi tiếp xúc cỏ dại ở vườn."}'
response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$payload" "${BACKEND_URL}/api/v1/triage")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

# 9. Routine Triage (Text Only)
print_case_header "9" "Routine Nail Triage (Text Only)"
echo -e "Requesting: POST ${BACKEND_URL}/api/v1/triage"
payload='{"user_id": "master-verify-patient", "text": "Móng chân cái của tôi bị dày lên, có màu vàng đục và bề mặt sần sùi dễ mủn."}'
response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$payload" "${BACKEND_URL}/api/v1/triage")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

# 10. Self-care Triage (Text Only)
print_case_header "10" "Dental Self-Care Triage (Text Only)"
echo -e "Requesting: POST ${BACKEND_URL}/api/v1/triage"
payload='{"user_id": "master-verify-patient", "text": "Răng dưới của tôi xuất hiện các vệt bám màu vàng cứng sát chân lợi nhưng không đau nhức."}'
response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$payload" "${BACKEND_URL}/api/v1/triage")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

# 11. Image Only Triage
print_case_header "11" "Image-Only Triage (CV Worker Direct Pipeline)"
echo -e "Requesting: POST ${BACKEND_URL}/api/v1/triage"
payload='{"user_id": "master-verify-patient", "image_url": "https://picsum.photos/224/224"}'
response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$payload" "${BACKEND_URL}/api/v1/triage")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

# 12. Image + Text Triage
print_case_header "12" "Image + Text Multimodal Triage"
echo -e "Requesting: POST ${BACKEND_URL}/api/v1/triage"
payload='{"user_id": "master-verify-patient", "text": "Da mu bàn tay tôi nổi mụn nước đỏ nhiều ngứa dữ dội.", "image_url": "https://picsum.photos/224/224"}'
response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$payload" "${BACKEND_URL}/api/v1/triage")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

# 13. Multi-session (History) Retrieval
print_case_header "13" "Multi-Session History Retrieval Check"
echo -e "Requesting: GET ${BACKEND_URL}/api/v1/sessions/${session_id}/history"
response=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/v1/sessions/${session_id}/history")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}SUCCESS (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}\n"
fi

echo -e "${BOLD}${YELLOW}======================================================================"
echo -e "🎉 ALL 13 MEDAGEN V2 CLINICAL INTEGRATION USE-CASES COMPLETED!"
echo -e "======================================================================${NC}"
