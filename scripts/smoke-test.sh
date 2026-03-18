#!/usr/bin/env bash
set -e

# ============================================================
# Smoke Test - 部署后接口健康检测
# 依次检测所有关键接口，任一失败立即 exit 1
# ============================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8001}"
MAX_WAIT="${MAX_WAIT:-60}"

PASSED=0
FAILED=0
TIMESTAMP=$(date +%s)
TEST_EMAIL="smoketest_${TIMESTAMP}@test.local"
TEST_PASSWORD="SmokePass_${TIMESTAMP}!"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_pass() { PASSED=$((PASSED+1)); echo -e "${GREEN}  ✅ PASS: $1${NC}"; }
log_fail() { FAILED=$((FAILED+1)); echo -e "${RED}  ❌ FAIL: $1${NC}"; }
log_info() { echo -e "${YELLOW}  ℹ️  $1${NC}"; }

# ----------------------------------------------------------
# 1. 等待后端服务就绪（轮询 health 端口）
# ----------------------------------------------------------
echo ""
echo "⏳ Waiting for backend to be ready (max ${MAX_WAIT}s)..."
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  if curl -sf "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}  Backend is ready after ${ELAPSED}s${NC}"
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED+2))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo -e "${RED}❌ Backend did not become ready within ${MAX_WAIT}s${NC}"
  exit 1
fi

# ----------------------------------------------------------
# Helper: 发起请求并检查状态码
# ----------------------------------------------------------
check_status() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" -eq "$expected" ] 2>/dev/null; then
    log_pass "$label (HTTP $actual)"
    return 0
  else
    log_fail "$label — expected HTTP $expected, got HTTP $actual"
    return 1
  fi
}

# ----------------------------------------------------------
# 2. GET /health（后端直连）
# ----------------------------------------------------------
echo ""
echo "🔍 Running smoke tests..."
echo "---"

STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${BACKEND_URL}/health")
check_status "GET ${BACKEND_URL}/health" 200 "$STATUS" || exit 1

# ----------------------------------------------------------
# 3. POST /api/auth/register
# ----------------------------------------------------------
REGISTER_RESP=$(curl -s -w '\n%{http_code}' \
  -X POST "${BASE_URL}/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"name\":\"SmokeTest\"}")
REGISTER_BODY=$(echo "$REGISTER_RESP" | sed '$d')
STATUS=$(echo "$REGISTER_RESP" | tail -1)
check_status "POST /api/auth/register" 200 "$STATUS" || check_status "POST /api/auth/register (201)" 201 "$STATUS" || exit 1

# ----------------------------------------------------------
# 4. POST /api/auth/login
# ----------------------------------------------------------
LOGIN_RESP=$(curl -s -w '\n%{http_code}' \
  -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")
LOGIN_BODY=$(echo "$LOGIN_RESP" | sed '$d')
STATUS=$(echo "$LOGIN_RESP" | tail -1)
check_status "POST /api/auth/login" 200 "$STATUS" || exit 1

# 提取 token
TOKEN=$(echo "$LOGIN_BODY" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  log_fail "Could not extract token from login response"
  exit 1
fi
log_info "Token extracted successfully"

# ----------------------------------------------------------
# 5. GET /api/auth/me
# ----------------------------------------------------------
STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -X GET "${BASE_URL}/api/auth/me" \
  -H "Authorization: Bearer ${TOKEN}")
check_status "GET /api/auth/me" 200 "$STATUS" || exit 1

# ----------------------------------------------------------
# 6. POST /api/conversations（创建对话）
# ----------------------------------------------------------
CONV_RESP=$(curl -s -w '\n%{http_code}' \
  -X POST "${BASE_URL}/api/conversations" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"title":"Smoke Test Conversation"}')
CONV_BODY=$(echo "$CONV_RESP" | sed '$d')
STATUS=$(echo "$CONV_RESP" | tail -1)
check_status "POST /api/conversations" 200 "$STATUS" || check_status "POST /api/conversations (201)" 201 "$STATUS" || exit 1

# 提取 conversation id
CONV_ID=$(echo "$CONV_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$CONV_ID" ]; then
  log_fail "Could not extract conversation id"
  exit 1
fi
log_info "Conversation created: ${CONV_ID}"

# ----------------------------------------------------------
# 7. GET /api/conversations（对话列表）
# ----------------------------------------------------------
STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -X GET "${BASE_URL}/api/conversations" \
  -H "Authorization: Bearer ${TOKEN}")
check_status "GET /api/conversations" 200 "$STATUS" || exit 1

# ----------------------------------------------------------
# 8. GET /api/conversations/:id（对话详情）
# ----------------------------------------------------------
STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -X GET "${BASE_URL}/api/conversations/${CONV_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
check_status "GET /api/conversations/${CONV_ID}" 200 "$STATUS" || exit 1

# ----------------------------------------------------------
# 9. POST /api/chat（聊天流式响应）
# ----------------------------------------------------------
CHAT_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  --max-time 30 \
  -X POST "${BASE_URL}/api/chat" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"conversationId\":\"${CONV_ID}\",\"message\":\"Hello, this is a smoke test.\"}")
check_status "POST /api/chat" 200 "$CHAT_STATUS" || exit 1

# ----------------------------------------------------------
# 10. DELETE /api/conversations/:id（清理测试数据）
# ----------------------------------------------------------
STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -X DELETE "${BASE_URL}/api/conversations/${CONV_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
check_status "DELETE /api/conversations/${CONV_ID}" 200 "$STATUS" || exit 1

# ----------------------------------------------------------
# 汇总结果
# ----------------------------------------------------------
echo ""
echo "==================================="
echo -e "  Tests passed: ${GREEN}${PASSED}${NC}"
echo -e "  Tests failed: ${RED}${FAILED}${NC}"
echo "==================================="

if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}❌ Some smoke tests failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All smoke tests passed${NC}"
exit 0
