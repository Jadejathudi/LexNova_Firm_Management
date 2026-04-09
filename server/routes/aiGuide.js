const express = require('express');
const { authenticateToken } = require('../middleware/auth');

// Simulated AI Legal Guide — in production this would hit a Python FastAPI microservice
const LEGAL_KNOWLEDGE = {
  'What happens after an FIR is filed?': `After an FIR (First Information Report) is filed:

1. **Investigation begins**: The police are obligated to investigate the matter. A case number is assigned.
2. **Evidence collection**: Police collect evidence, record statements of witnesses under Section 161 CrPC.
3. **Arrest (if applicable)**: If the offence is cognizable, police can arrest without warrant. For non-cognizable offences, court permission is needed.
4. **Chargesheet**: Within 60-90 days, police must file a chargesheet (or closure report) before the Magistrate.
5. **Court proceedings**: If chargesheet is filed, the court takes cognizance and trial begins.

⚖️ *This is general information. For advice specific to your case, please book a consultation with our advocates.*`,

  'How long does a civil case take?': `Civil case timelines in India vary significantly:

1. **District Court level**: 2-5 years on average
2. **High Court (appeal)**: 2-3 additional years
3. **Supreme Court (if applicable)**: 1-3 additional years

**Factors that affect duration:**
- Complexity of the matter
- Number of witnesses and documents
- Court backlog in your jurisdiction
- Whether parties cooperate or seek adjournments

**Tips to speed up your case:**
- File all documents on time
- Avoid unnecessary adjournments
- Consider mediation or arbitration as alternatives

⚖️ *Every case is different. Book a free consultation for a realistic timeline estimate.*`,

  'What is anticipatory bail?': `**Anticipatory Bail** (Section 438 CrPC / Section 482 BNSS):

Anticipatory bail is a legal provision that allows a person to seek bail **before being arrested**, in anticipation of arrest.

**Key points:**
1. Filed before the High Court or Sessions Court
2. Must show reasonable apprehension of arrest
3. Court may impose conditions (surrendering passport, regular reporting, etc.)
4. Protects against misuse of criminal law
5. Cannot be granted for all offences (restrictions apply for certain serious crimes)

**When to apply:**
- When you have information that a case may be filed against you
- When you fear arrest in connection with a non-bailable offence
- When there is a risk of false implication

⚖️ *Anticipatory bail is time-sensitive. If you need this, please book an urgent consultation immediately.*`,
};

const GENERAL_RESPONSES = [
  "I understand your concern. Let me share some general legal information.",
  "That's a common question. Here's what Indian law says about this.",
  "I can provide general guidance on this topic.",
];

module.exports = function (db) {
  const router = express.Router();

  // POST /api/ai-guide/ask — AI Legal Guide
  router.post('/ask', (req, res) => {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Check for pre-built answers
    const lowerQ = question.toLowerCase();
    let answer = null;
    let confidence = 0;

    for (const [key, value] of Object.entries(LEGAL_KNOWLEDGE)) {
      if (lowerQ.includes(key.toLowerCase().split(' ').slice(2).join(' '))) {
        answer = value;
        confidence = 85;
        break;
      }
    }

    if (!answer) {
      // Generic response based on keywords
      if (lowerQ.includes('fir') || lowerQ.includes('police') || lowerQ.includes('arrest')) {
        answer = `Regarding criminal matters and FIRs:\n\n` +
          `An FIR is the first step in the criminal justice process. It is filed at a police station and triggers a formal investigation. ` +
          `You have the right to a copy of the FIR, right to legal representation, and right to bail (for bailable offences).\n\n` +
          `⚖️ *Criminal matters require immediate professional guidance. Book a consultation now.*`;
        confidence = 70;
      } else if (lowerQ.includes('property') || lowerQ.includes('land') || lowerQ.includes('real estate')) {
        answer = `Regarding property disputes:\n\n` +
          `Property disputes in India are governed by various laws including the Transfer of Property Act, Registration Act, and RERA. ` +
          `Key steps include verifying title deeds, checking encumbrance certificates, and understanding local land revenue records.\n\n` +
          `⚖️ *Property matters involve significant financial stakes. Book a consultation for proper title verification.*`;
        confidence = 70;
      } else if (lowerQ.includes('divorce') || lowerQ.includes('custody') || lowerQ.includes('maintenance')) {
        answer = `Regarding family law matters:\n\n` +
          `Divorce in India can be by mutual consent (6-18 months) or contested (2-5+ years). ` +
          `Child custody is decided based on the welfare of the child. Maintenance can be claimed under various laws.\n\n` +
          `⚖️ *Family matters are sensitive. Book a confidential consultation with our family law advocates.*`;
        confidence = 72;
      } else if (lowerQ.includes('contract') || lowerQ.includes('agreement') || lowerQ.includes('company')) {
        answer = `Regarding corporate and contract law:\n\n` +
          `The Indian Contract Act, 1872 governs all contracts in India. Key elements include offer, acceptance, consideration, ` +
          `and lawful object. For companies, the Companies Act, 2013 provides the regulatory framework.\n\n` +
          `⚖️ *Corporate legal matters require expert review. Book a consultation with our corporate law team.*`;
        confidence = 68;
      } else {
        answer = `Thank you for your question. While I can provide general legal information, your question requires ` +
          `a more detailed analysis by one of our experienced advocates.\n\n` +
          `**What I can tell you:**\n` +
          `- Every legal matter has unique facts and circumstances\n` +
          `- Indian law provides rights and remedies for most situations\n` +
          `- Early legal consultation can save time, money, and stress\n\n` +
          `⚖️ *Book a free 30-minute consultation to discuss your specific situation with an advocate.*`;
        confidence = 40;
      }
    }

    const escalate = confidence < 70;

    res.json({
      answer,
      confidence,
      escalate,
      disclaimer: 'This is general legal information and not legal advice. Please consult a qualified advocate for advice specific to your situation.',
      suggested_questions: Object.keys(LEGAL_KNOWLEDGE),
    });
  });

  // GET /api/ai-guide/questions — Get suggested questions
  router.get('/questions', (req, res) => {
    res.json({
      questions: Object.keys(LEGAL_KNOWLEDGE),
      categories: ['Criminal Law', 'Civil Law', 'Corporate Law', 'Family Law', 'Property Law'],
    });
  });

  return router;
};
