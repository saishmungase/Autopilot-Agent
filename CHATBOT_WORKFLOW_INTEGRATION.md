# Chatbot Workflow Integration - Complete

## Overview
The chatbot now automatically submits collected conversation data to the Supervity workflow API when the conversation ends or when the user closes the chat window.

## Implementation Details

### When Data is Submitted
1. **Conversation Ends**: When `data.done === true` from the backend
2. **User Closes Window**: When user clicks the X button to close the chat

### Submission Logic

#### API Endpoint
- **URL**: `https://auto-workflow-api.supervity.ai/api/v1/workflow-runs/execute/stream`
- **Workflow ID**: `019e311c-a949-7000-9e6d-03c12d18031b`
- **Authorization**: Bearer token (same as form)

#### Payload Format
```javascript
FormData {
  workflowId: '019e311c-a949-7000-9e6d-03c12d18031b',
  'inputs[source]': 'chatbot',  // ← Key difference from form
  'inputs[payload_text]': 'Chat Session ID: chat_1234567890_abc123\n\nUser: I need health insurance\nAI: Great! I can help you with that...\nUser: For my family\nAI: ...'
}
```

#### Payload Text Structure
```
Chat Session ID: {sessionId}

User: {message1}
AI: {response1}
User: {message2}
AI: {response2}
...
```

### Key Features

1. **Automatic Submission**
   - Triggers when conversation is marked as done by backend
   - Triggers when user closes the chat window (if messages exist)
   - Only submits once per conversation (prevents duplicates)

2. **State Management**
   - `leadSubmitted` flag prevents duplicate submissions
   - Resets when user starts a new chat

3. **Data Captured**
   - Complete conversation history
   - Session ID for tracking
   - All user and AI messages in chronological order

4. **Error Handling**
   - Silent failure (doesn't interrupt user experience)
   - Console logging for debugging
   - Continues to work even if submission fails

### UI Changes

1. **Close Button**
   - Added X button in header (always visible)
   - Replaces the "Reset" button
   - Triggers data submission before closing

2. **Reset Functionality**
   - Available in the "done" state footer
   - Clears all state including `leadSubmitted` flag

### Code Flow

```javascript
// 1. User starts chat
handleStart() → sendToAgent(null)

// 2. Conversation continues
send(text) → sendToAgent(text) → messages updated

// 3. Conversation ends (backend sets done=true)
sendToAgent() → data.done === true → submitChatData()

// OR

// 3. User closes window
handleClose() → submitChatData() → setOpen(false)

// 4. Data submitted to workflow API
submitChatData() → FormData with source='chatbot' → API call
```

### Comparison: Form vs Chatbot

| Aspect | Form | Chatbot |
|--------|------|---------|
| **Source** | `inputs[source] = 'form'` | `inputs[source] = 'chatbot'` |
| **Payload** | Structured fields | Conversation history |
| **Format** | `Full Name: X, Email: Y...` | `User: X\nAI: Y\n...` |
| **Trigger** | Submit button click | Conversation end or close |
| **User Action** | Explicit submission | Automatic |

### Testing

#### Test Scenario 1: Complete Conversation
1. Open chatbot
2. Start chat
3. Have a conversation
4. Wait for conversation to end (done=true)
5. Check console: "Chatbot data submitted successfully"

#### Test Scenario 2: Early Close
1. Open chatbot
2. Start chat
3. Send a few messages
4. Click X to close
5. Check console: "Submitting chatbot data to workflow API"

#### Test Scenario 3: No Duplicate Submission
1. Complete a conversation (done=true)
2. Close the window
3. Check console: Only one submission logged

### Console Logs

When data is submitted, you'll see:
```
Submitting chatbot data to workflow API
Payload text: Chat Session ID: chat_1234567890_abc123

User: I need health insurance
AI: Great! I can help you with that...
...
Chatbot data submitted successfully
```

### Benefits

1. **Automatic Lead Capture**: No manual submission needed
2. **Complete Context**: Full conversation history preserved
3. **Source Tracking**: Easy to identify chatbot vs form leads
4. **User-Friendly**: Seamless experience, no extra steps
5. **Flexible**: Works whether conversation completes or user closes early

## Notes

- The chatbot still uses the local backend API (`/api/chat/message`) for conversation
- Only the final data submission goes to the workflow API
- The workflow API receives the same format as the form, just with different source and content
- Session ID is included for tracking and debugging
