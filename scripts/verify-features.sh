#!/bin/bash

echo "🔍 Verifying AgentDB9 Features..."
echo ""

# Check if components exist
echo "📦 Checking component files..."
components=(
  "frontend/src/components/MessageFeedback.tsx"
  "frontend/src/components/ApprovalDialogSimple.tsx"
  "frontend/src/components/TaskProgressBarSimple.tsx"
)

for component in "${components[@]}"; do
  if [ -f "$component" ]; then
    echo "  ✅ $component"
  else
    echo "  ❌ $component (MISSING)"
  fi
done

echo ""
echo "📄 Checking if features are imported in chat page..."
if grep -q "MessageFeedback" frontend/src/app/chat/page.tsx; then
  echo "  ✅ MessageFeedback imported"
else
  echo "  ❌ MessageFeedback NOT imported"
fi

if grep -q "ApprovalDialog" frontend/src/app/chat/page.tsx; then
  echo "  ✅ ApprovalDialog imported"
else
  echo "  ❌ ApprovalDialog NOT imported"
fi

if grep -q "TaskProgressBar" frontend/src/app/chat/page.tsx; then
  echo "  ✅ TaskProgressBar imported"
else
  echo "  ❌ TaskProgressBar NOT imported"
fi

echo ""
echo "🔧 Checking if features are rendered..."
if grep -q "<MessageFeedback" frontend/src/app/chat/page.tsx; then
  echo "  ✅ MessageFeedback component used"
else
  echo "  ❌ MessageFeedback component NOT used"
fi

if grep -q "<ApprovalDialog" frontend/src/app/chat/page.tsx; then
  echo "  ✅ ApprovalDialog component used"
else
  echo "  ❌ ApprovalDialog component NOT used"
fi

if grep -q "<TaskProgressBar" frontend/src/app/chat/page.tsx; then
  echo "  ✅ TaskProgressBar component used"
else
  echo "  ❌ TaskProgressBar component NOT used"
fi

echo ""
echo "🌐 Checking backend endpoints..."
if grep -q "updateMessageFeedback" backend/src/conversations/conversations.service.ts; then
  echo "  ✅ Feedback backend endpoint exists"
else
  echo "  ❌ Feedback backend endpoint MISSING"
fi

if grep -q "ApprovalService" backend/src/common/services/approval.service.ts 2>/dev/null; then
  echo "  ✅ Approval service exists"
else
  echo "  ❌ Approval service MISSING"
fi

echo ""
echo "📊 Summary:"
echo "  - Features are implemented in /chat page"
echo "  - NOT in /workspace page (different purpose)"
echo ""
echo "🚀 To see the features:"
echo "  1. Start the application: docker-compose up"
echo "  2. Navigate to: http://localhost:3000/chat"
echo "  3. Create/select an agent"
echo "  4. Start chatting to see feedback buttons"
echo ""
echo "📖 For more details, see: FEATURES_LOCATION.md"
