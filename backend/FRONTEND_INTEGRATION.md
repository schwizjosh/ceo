# 🚀 FRONTEND INTEGRATION GUIDE - NEW SEASONS API

## ✅ BACKEND IS READY!

All new multi-agent endpoints are live and operational. The old endpoints have been upgraded to use the powerful orchestrator system.

---

## 📡 API ENDPOINT TO USE

### **Generate Monthly Plot (UPGRADED WITH MULTI-AGENT ORCHESTRATOR)**

```
POST https://andorabrand.me/api/ai/generate-monthly-theme
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Request Body:**
```json
{
  "brandId": "5f98e65d-22f0-457b-8bc4-bf231955b8c5",  // ⚠️ REQUIRED!
  "month": "2025-10",  // Format: "YYYY-MM" or "October 2025"
  "themePrompt": "Radical outreach with our new Products, Deluxe CRM and Andora. Handshakes, deals, vibes and resonance",
  "brandContext": {
    "brandName": "Andora",
    "about": "AI-powered brand storytelling platform",
    "persona": "Bold, innovative, narrative-driven"
  },
  "events": []  // Optional: Events for this month
}
```

**Response:**
```json
{
  "success": true,
  "theme": "Radical Outreach: When Products Become Handshakes",
  "explanation": "A 400-600 word RICH, DETAILED monthly plot that fully explores your theme about radical outreach, Deluxe CRM, Andora, handshakes, deals, vibes, and resonance. The AI will create a complete narrative arc with:\n- Week 1: The Opening Hook\n- Week 2: Rising Action  \n- Week 3: The Climax\n- Week 4: Resolution\n\nWith specific content ideas, character moments, emotional beats, and visual direction ALL centered around YOUR input.",
  "metadata": {
    "tokensUsed": 1500,
    "duration": 3000,
    "cost": 0.02,
    "model": "gpt-4o"
  }
}
```

---

## 🔥 WHAT CHANGED

### **BEFORE (Old System):**
- ❌ Generic theme generation
- ❌ Ignored user's detailed input
- ❌ Simple AI prompt
- ❌ Output: "The Great Connection: When Innovation Meets Its Moment" (generic)

### **AFTER (New Multi-Agent System):**
- ✅ Uses **SeasonPlotAgent** with sophisticated orchestration
- ✅ **YOUR INPUT IS PRIMARY** - becomes the central theme
- ✅ Advanced prompt with 400-600 word detailed output
- ✅ Includes narrative arcs, character moments, content sparks
- ✅ Model Router selects best AI (GPT-4o/Claude Sonnet)
- ✅ Context caching for performance
- ✅ Fallback models for resilience

---

## 🎯 FRONTEND CODE EXAMPLE

```typescript
// src/lib/api.ts or wherever you make API calls

export async function generateMonthlyPlot(params: {
  brandId: string;
  month: string;  // "2025-10" or "October 2025"
  themePrompt: string;  // USER'S INPUT - THIS IS THE MAIN THEME!
  brandContext: {
    brandName: string;
    about?: string;
    persona?: string;
  };
  events?: Array<{
    title: string;
    description?: string;
    date: string;
  }>;
}) {
  const response = await fetch('https://andorabrand.me/api/ai/generate-monthly-theme', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error('Failed to generate monthly plot');
  }

  return response.json();
}
```

---

## 📋 WHAT THE FRONTEND NEEDS TO SEND

### **CRITICAL: brandId is REQUIRED**

The new system requires `brandId` to:
1. Query the database for brand context
2. Retrieve events for the month
3. Get previous month's theme for narrative continuity
4. Cache context for performance

### **Where to Get brandId:**

```typescript
// Example from your MonthlyPage component
const { brandId } = useBrand();  // Or however you get it

// When user enters their theme
const userThemeInput = "Radical outreach with our new Products, Deluxe CRM and Andora. Handshakes, deals, vibes and resonance";

// Call the API
const result = await generateMonthlyPlot({
  brandId: brandId,  // ⚠️ MUST INCLUDE THIS!
  month: "2025-10",
  themePrompt: userThemeInput,  // This becomes the central theme
  brandContext: {
    brandName: brand.name,
    about: brand.about,
    persona: brand.persona
  }
});

// Save the result
console.log(result.theme);        // "Radical Outreach: When Products Become Handshakes"
console.log(result.explanation);  // 400-600 word detailed plot
```

---

## 🔍 DEBUGGING

### **Check Logs:**
```bash
pm2 logs andora-backend --lines 50
```

### **What to Look For:**
```
🎭 NEW Monthly Theme Generation - Using Multi-Agent Orchestrator
📝 User Input (themePrompt): Radical outreach with our new Products...
[Orchestrator] Orchestrating monthly plot generation { month: 10, year: 2025 }
[Orchestrator] Model selected { model: 'gpt-4o' }
[SeasonPlotAgent] Generating monthly plot { month: 'October', year: 2025, hasEvents: false }
✅ Multi-Agent Result: { theme: '...', descriptionLength: 543, tokensUsed: 1450 }
```

---

## 🚨 COMMON ISSUES

### **Issue 1: Still getting generic themes**
**Problem:** Frontend not sending `brandId`
**Solution:** Add `brandId` to the request body

### **Issue 2: "brandId is required" error**
**Problem:** Frontend code missing brandId parameter
**Solution:** Extract brandId from your brand context/state and include it

### **Issue 3: Theme doesn't match user input**
**Problem:** Not sending user's input as `themePrompt`
**Solution:**
```typescript
// ❌ WRONG:
{ theme: userInput }

// ✅ CORRECT:
{ themePrompt: userInput }
```

---

## 🎉 READY TO TEST!

1. **Update your frontend code** to include `brandId` and `themePrompt`
2. **Try generating a monthly plot** with your theme
3. **Check the logs** to see the multi-agent system working
4. **Get a RICH 400-600 word plot** that centers on YOUR theme!

The backend is ready and waiting! 🚀
