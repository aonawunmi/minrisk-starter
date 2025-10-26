# MinRisk AI Assistant Setup Guide

## Overview

MinRisk now includes **AI-powered risk management features** using **Claude 3.5 Haiku** by Anthropic. This guide will help you set up and use the AI Assistant.

## Features Implemented

### 1. **✨ AI Assistant Tab** - Risk Generator
Located in the main navigation tabs, this feature allows you to:
- Generate context-specific risks based on industry, business unit, and risk category
- Provide additional context for more accurate risk suggestions
- Select and save generated risks directly to your risk register
- Customize the number of risks to generate (1-10)

**Cost**: ~$0.0016 per generation (less than 0.2 cents)

### 2. **💬 Floating AI Chat Assistant**
A persistent chat button in the bottom-right corner that provides:
- Conversational AI assistance for risk management questions
- Context-aware responses about compliance, controls, and risk assessment
- Full conversation history within the session

**Cost**: ~$0.0016 per message

### 3. **🎯 AI Control Suggester** (Component Ready)
Suggests control measures for specific risks (can be integrated into risk edit dialogs)

---

## Setup Instructions

### Step 1: Get Your Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up or log in to your account
3. Navigate to **API Keys** in the left sidebar
4. Click **Create Key**
5. Copy your API key (starts with `sk-ant-api03-...`)

### Step 2: Configure Environment Variables

1. Open your `.env` file in the project root
2. Add your Anthropic API key:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

3. Save the file

### Step 3: Restart Your Development Server

```bash
npm run dev
```

### Step 4: Test the AI Assistant

1. Open MinRisk in your browser
2. Click on the **✨ AI Assistant** tab
3. Try generating some risks:
   - Industry: "Banking"
   - Business Unit: "Trading Desk"
   - Risk Category: "Operational"
4. Click the **floating sparkle button** (bottom-right) to test the chat assistant

---

## Usage Guide

### Generating Risks

1. Navigate to **✨ AI Assistant** tab
2. Fill in the context form:
   - **Industry** (required): e.g., "Banking", "Insurance", "Healthcare"
   - **Business Unit**: e.g., "IT Operations", "Trading Desk"
   - **Risk Category**: Select from dropdown or leave as "All Categories"
   - **Additional Context**: Provide specific details about your needs
   - **Number of Risks**: Choose how many risks to generate (1-10)
3. Click **Generate Risks**
4. Review generated risks
5. Select risks you want to save (checkbox)
6. Click **Save Selected** to add them to your risk register

### Using the Chat Assistant

1. Click the **sparkle button** in the bottom-right corner
2. Type your question about risk management
3. Press Enter or click Send
4. Chat history is maintained during your session

**Example Questions**:
- "What are common operational risks for a trading desk?"
- "Explain the difference between inherent and residual risk"
- "What controls should I implement for cybersecurity risks?"
- "How do I assess the likelihood of a market risk?"

---

## Cost Management

### Understanding Costs

**Model**: Claude 3.5 Haiku
- **Input**: $0.80 per million tokens (~$0.0008 per 1K tokens)
- **Output**: $4.00 per million tokens (~$0.004 per 1K tokens)

### Typical Usage Costs

| Usage Level | Queries/Month | Estimated Cost |
|------------|---------------|----------------|
| Light | 100 | $0.16 |
| Medium | 1,000 | $1.60 |
| Heavy | 10,000 | $16.00 |
| Enterprise | 100,000 | $160.00 |

### Pricing Models

**Option 1: Direct Payment** (Recommended)
- You pay Anthropic directly
- Pay-as-you-go, no minimum
- Best for getting started

**Option 2: Pass-Through to Users**
- Charge users $0.01-0.05 per query
- Your cost: $0.0016/query
- Profit margin: $0.0084-0.0484/query

**Option 3: Subscription Model**
- Basic: $5-10/month (includes 3,000-6,000 queries)
- Professional: $20-50/month (includes 12,000-30,000 queries)
- Enterprise: Custom pricing

---

## How It Works

### Context-Rich Prompts

The AI generates risks based on:

1. **Your Input Context**:
   - Industry type (e.g., "Banking")
   - Business unit (e.g., "Trading Desk")
   - Risk category (e.g., "Operational")
   - Additional context you provide

2. **Claude's Training Data** (up to January 2025):
   - Industry standards (ISO 31000, COSO ERM, Basel III)
   - Regulatory frameworks (SEC, MiFID II, Dodd-Frank)
   - Published risk assessments and case studies
   - Best practices from thousands of organizations

3. **Your Existing Risks** (optional enhancement):
   - Can be configured to analyze your current risk register
   - Suggests risks you might have missed
   - Avoids duplicating existing entries

### What Claude CANNOT Do

- ❌ Access real-time market data
- ❌ Search your internal documents (unless you provide them)
- ❌ Know your specific institution's risk history
- ❌ Access external databases or APIs
- ❌ Browse the internet

### What Claude CAN Do

- ✅ Apply general risk management principles
- ✅ Suggest risks based on industry standards
- ✅ Customize suggestions based on your context
- ✅ Generate control measures and mitigation strategies
- ✅ Answer risk management questions
- ✅ Draft risk descriptions in professional language

---

## Technical Details

### Files Created/Modified

**New Components**:
- `src/lib/ai.ts` - Enhanced AI service with context-rich prompt generation
- `src/components/AIChatAssistant.tsx` - Floating chat interface
- `src/components/AIRiskGenerator.tsx` - Risk generation interface
- `src/components/AIControlSuggester.tsx` - Control measures generator

**Modified Files**:
- `src/App.tsx` - Integrated AI components
- `.env.example` - Added `VITE_ANTHROPIC_API_KEY`

### Key Functions

**`generateRisks(context, count)`**
- Generates risks based on provided context
- Returns array of `GeneratedRisk` objects
- Includes title, description, category, severity, likelihood

**`generateControlMeasures(riskTitle, riskDescription, context)`**
- Generates 5-7 control measures for a specific risk
- Returns array of control measure strings
- Context-aware suggestions

**`askClaude(prompt, history)`**
- General-purpose Claude API call
- Maintains conversation history
- Returns text response

---

## Troubleshooting

### "VITE_ANTHROPIC_API_KEY not configured"

**Solution**:
1. Check your `.env` file has the correct key
2. Restart your dev server (`npm run dev`)
3. Clear browser cache and reload

### "Failed to call Claude API"

**Possible causes**:
1. Invalid API key
2. No API credits remaining
3. Network connectivity issues
4. API rate limits exceeded

**Solution**:
1. Verify API key at https://console.anthropic.com
2. Check your Anthropic account balance
3. Check network connection
4. Wait a few minutes if rate-limited

### Risks not generating

**Solution**:
1. Ensure "Industry" field is filled (required)
2. Check browser console for errors
3. Verify API key is set correctly
4. Try with simpler context first

---

## Best Practices

1. **Be Specific**: The more context you provide, the better the AI suggestions
2. **Review All Suggestions**: AI-generated content should always be reviewed by humans
3. **Customize for Your Organization**: Edit generated risks to match your specific situation
4. **Monitor Costs**: Track your API usage in the Anthropic console
5. **Start Small**: Test with small numbers of risks first
6. **Provide Feedback**: Note which suggestions are helpful to improve future prompts

---

## Future Enhancements

Potential improvements:
- **RAG (Retrieval Augmented Generation)**: Connect AI to your existing risk library
- **Fine-tuning**: Train custom model on your organization's risk data
- **Automated Risk Scoring**: AI-powered severity/likelihood assessment
- **Control Effectiveness Analysis**: AI evaluation of control adequacy
- **Trend Analysis**: AI-powered risk trend identification

---

## Support

For issues or questions:
1. Check this documentation first
2. Review the Anthropic API documentation: https://docs.anthropic.com
3. Check the MinRisk GitHub issues
4. Contact your MinRisk administrator

---

## Security Notes

- API keys are sensitive - never commit `.env` files to version control
- The `.gitignore` file excludes `.env*` files (except `.env.example`)
- API calls are made directly from the browser (client-side)
- For production, consider implementing a backend proxy to hide API keys
- Monitor API usage regularly to prevent unexpected costs

---

**Version**: 1.0
**Last Updated**: 2025-01-21
**Model**: Claude 3.5 Haiku (claude-3-5-haiku-20241022)
