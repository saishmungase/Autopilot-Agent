# Quick Start Guide - InsureFlow Platform

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Start the Backend (Terminal 1)
```bash
cd /Users/madhavchaturvedi/Autopilot-Agent
make run
```

✅ Backend running at: `http://localhost:8001`

---

### Step 2: Start the Frontend (Terminal 2)
```bash
cd /Users/madhavchaturvedi/Autopilot-Agent/frontend
npm run dev
```

✅ Frontend running at: `http://localhost:3000`

---

### Step 3: Access the Platform

#### 🏠 Home Page
**URL**: `http://localhost:3000/`

**What to try**:
1. Scroll through the beautiful landing page
2. Fill out the "Get a Quote" form
3. Click the floating chat button (bottom-right)
4. Start a conversation with the AI
5. Close the chat - data auto-submits to workflow API

---

#### 📊 Command Center Dashboard
**URL**: `http://localhost:3000/command-center`

**What to see**:
1. Live clock updating every second
2. KPI cards with animated counters
3. Live lead feed (auto-refreshes every 30s)
4. Rep workload panel with progress bars
5. AI Workbench panel (amber border)
6. Audit trail table
7. Click any lead to see details modal

---

#### 👤 Sales Portal
**URL**: `http://localhost:3000/sales`

**What to do**:
1. Click "Register" tab
2. Enter:
   - Full Name: Test Rep
   - Team: health
   - Username: testrep
   - Password: password123
3. Click "Create Account"
4. View your personal dashboard
5. See assigned and completed leads

---

## 🎯 Quick Test Scenarios

### Test 1: Submit a Lead via Form
1. Go to home page: `http://localhost:3000/`
2. Scroll to "Get a Quote" section
3. Fill out:
   - Full Name: John Doe
   - Email: john@example.com
   - Phone: +1 555-123-4567
   - Policy Type: Health Insurance
   - Message: Need family coverage
4. Click "Request a Callback"
5. See success message
6. Check Command Center to see the lead appear

### Test 2: Chat with AI
1. Go to home page: `http://localhost:3000/`
2. Click floating chat button (bottom-right)
3. Click "Start Chat"
4. Type: "I need health insurance"
5. Continue conversation
6. Close the chat window
7. Check browser console: "Chatbot data submitted successfully"

### Test 3: View Command Center
1. Go to: `http://localhost:3000/command-center`
2. Watch the live clock
3. See KPI numbers count up
4. Click any lead in the feed
5. View lead details modal
6. Close modal
7. Watch auto-refresh (check "Last updated" timestamp)

---

## 🎨 Design System Preview

### Colors
- **Emerald**: Primary accent (green)
- **Electric Blue**: Secondary accent (blue)
- **Dark Charcoal**: Background
- **Near White**: Text

### Effects
- **Glassmorphism**: Frosted glass cards
- **Backdrop Blur**: Smooth background blur
- **Gradient Accents**: Emerald → Electric Blue
- **Glow Effects**: Subtle shadows on interactive elements
- **Animations**: Pulse dots, slide-up, counter animations

---

## 📱 Navigation

### From Home Page
- **Command Center**: Click "Command Center" button in navbar
- **Sales Portal**: Go to `/sales` manually
- **About**: Scroll or click navbar links
- **Contact**: Scroll to bottom

### From Command Center
- **Home**: Click browser back or go to `/`
- **Lead Details**: Click any lead in the feed
- **Workbench Actions**: Click Approve/Reject buttons

### From Sales Portal
- **Home**: Click "← Back to home" link
- **Sign Out**: Click "Sign Out" button
- **Refresh**: Click "Refresh" button

---

## 🔧 Troubleshooting

### Backend Not Starting
```bash
# Check if port 8001 is in use
lsof -i :8001

# Kill process if needed
kill -9 <PID>

# Restart backend
make run
```

### Frontend Not Starting
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>

# Restart frontend
npm run dev
```

### API Errors
1. Check backend is running: `http://localhost:8001/docs`
2. Check environment variables in `.env`
3. Check browser console for errors
4. Check backend terminal for logs

### Chat Not Working
1. Verify `GEMINI_API_KEY` in backend `.env`
2. Check backend logs for errors
3. Check browser console for API errors
4. Try refreshing the page

### Form Not Submitting
1. Check browser console for errors
2. Verify workflow API credentials in code
3. Check network tab for failed requests
4. Try with different data

---

## 📊 What to Expect

### Home Page
- ✅ Smooth animations
- ✅ Glassmorphic cards
- ✅ Working form submission
- ✅ Functional chatbot
- ✅ Auto-submit on chat close

### Command Center
- ✅ Live clock
- ✅ Animated counters
- ✅ Auto-refreshing data
- ✅ Clickable leads
- ✅ Modal overlays
- ⏳ Charts (placeholder - needs Recharts)

### Sales Portal
- ✅ Authentication
- ✅ Personal dashboard
- ✅ Lead cards
- ✅ Refresh functionality

---

## 🎯 Next Steps

1. **Add Real Data**: Create more leads via form/chat
2. **Test Workflows**: Watch leads flow through system
3. **Customize**: Modify colors, text, or layout
4. **Add Charts**: Install Recharts and implement visualizations
5. **Deploy**: Build for production and deploy

---

## 📚 Documentation Files

- `COMPLETE_SUMMARY.md` - Full project overview
- `COMMAND_CENTER_DASHBOARD.md` - Dashboard details
- `DESIGN_SYSTEM_PROMPT.md` - Design system guide
- `FORM_UPDATE.md` - Form integration details
- `CHATBOT_WORKFLOW_INTEGRATION.md` - Chatbot details
- `HOMEPAGE_UPDATE.md` - Home page changes

---

## 🎉 You're All Set!

The platform is now running with:
- ✅ Beautiful landing page with chatbot
- ✅ Enterprise command center dashboard
- ✅ Sales portal for reps
- ✅ Real-time data updates
- ✅ Premium dark theme design

**Enjoy exploring the InsureFlow platform!** 🚀
