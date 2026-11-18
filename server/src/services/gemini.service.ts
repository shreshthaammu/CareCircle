import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Language } from '../types/index.js';

export interface ScannedMedication {
  name: string;
  dosage: string;
  form: string;
  instructions: string;
  timesPerDay: number;
  suggestedTimes: string[];
  stockCount?: number;
  confidence: number;
}

export interface ParsedScheduleDraft {
  name: string;
  dosage: string;
  form: string;
  instructions: string;
  times: string[];
  daysOfWeek: number[];
  durationDays?: number;
  notes?: string;
}

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private isAvailable = false;

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
      try {
        this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        this.isAvailable = true;
        logger.info('Gemini AI service successfully initialized with @google/genai (gemini-3.8-flash)');
      } catch (err) {
        logger.warn('Failed to initialize Gemini AI client, falling back to heuristic mock mode', err);
        this.isAvailable = false;
      }
    } else {
      logger.info('GEMINI_API_KEY not set — Gemini AI service running in graceful simulated mode');
      this.isAvailable = false;
    }
  }

  /**
   * Scan prescription image or medicine strip and extract structured medicines
   */
  async scanPrescription(imageBase64: string, mimeType = 'image/jpeg'): Promise<{
    medications: ScannedMedication[];
    disclaimer: string;
    isSimulated: boolean;
  }> {
    const disclaimer = 'AI-generated, please verify with your doctor or pharmacist. CareCircle does not provide medical diagnoses or dosage advice.';

    if (!this.isAvailable || !this.client) {
      logger.warn('Prescription scanning unavailable because Gemini is not configured');
      return {
        medications: [],
        disclaimer: 'Prescription scanning is unavailable. No medication details were extracted; enter them manually or try again when the AI service is configured.',
        isSimulated: true,
      };
    }

    try {
      const prompt = `You are an expert healthcare document parser for an elderly care application.
Examine this image of a medical prescription or medicine strip.
Extract all medications into a strictly structured JSON array.
For each medication include:
- name: string (brand or generic medicine name)
- dosage: string (e.g. "500mg", "10ml")
- form: string (e.g. "Tablet", "Capsule", "Syrup", "Drops", "Inhaler")
- instructions: string (clear timing instructions like "with meals" or "before sleep")
- timesPerDay: number (e.g. 1, 2, 3)
- suggestedTimes: array of strings in 24h format (e.g. ["08:00", "20:00"])
- stockCount: number (estimated quantity or tablets per strip, default 30)
- confidence: number between 0 and 1

Return only the valid JSON array without markdown formatting.`;

      const response = await this.client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType,
              data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '[]';
      const parsed = JSON.parse(text);
      const medications: ScannedMedication[] = Array.isArray(parsed) ? parsed : (parsed.medications || []);

      return {
        medications,
        disclaimer,
        isSimulated: false,
      };
    } catch (err) {
      logger.error('Gemini vision API error during prescription scan', err);
      return {
        medications: [],
        disclaimer: 'Prescription scanning failed. No medication details were extracted; enter them manually or try again later.',
        isSimulated: true,
      };
    }
  }

  /**
   * Parse natural-language text or voice transcript into structured schedule draft
   * e.g., "Metformin 500mg after breakfast and dinner for 3 months"
   */
  async parseScheduleNaturalLanguage(input: string): Promise<{
    draft: ParsedScheduleDraft;
    disclaimer: string;
    isSimulated: boolean;
  }> {
    const disclaimer = 'AI-generated, please verify with your doctor or pharmacist. CareCircle does not provide medical diagnoses or dosage advice.';

    if (!this.isAvailable || !this.client) {
      logger.info('Simulated natural language schedule parser active');
      // Rule-based heuristic fallback
      const times: string[] = [];
      const lower = input.toLowerCase();

      if (lower.includes('breakfast') || lower.includes('morning')) times.push('08:00');
      if (lower.includes('lunch') || lower.includes('afternoon')) times.push('13:00');
      if (lower.includes('dinner') || lower.includes('night') || lower.includes('bed')) times.push('20:00');
      if (times.length === 0) times.push('09:00');

      return {
        draft: {
          name: input.split(' ')[0] || 'New Medication',
          dosage: input.match(/\d+\s*(?:mg|ml|mcg|g)/i)?.[0] || '1 tablet',
          form: 'Tablet',
          instructions: input,
          times,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          durationDays: 90,
          notes: 'Added via natural language',
        },
        disclaimer,
        isSimulated: true,
      };
    }

    try {
      const prompt = `Parse the following natural language medication schedule description into a structured JSON object.
Text: "${input}"

Output schema:
{
  "name": string (medication name),
  "dosage": string (e.g. "500mg"),
  "form": string (e.g. "Tablet", "Capsule", "Drops"),
  "instructions": string (e.g. "Take after meals"),
  "times": array of HH:mm 24-hour strings (e.g. ["08:00", "20:00"]),
  "daysOfWeek": array of integers 0 to 6 (0=Sunday ... 6=Saturday, default [0,1,2,3,4,5,6]),
  "durationDays": number or null,
  "notes": string
}`;

      const response = await this.client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed: ParsedScheduleDraft = JSON.parse(response.text || '{}');
      return {
        draft: parsed,
        disclaimer,
        isSimulated: false,
      };
    } catch (err) {
      logger.error('Gemini NLP parse failed, using heuristic fallback', err);
      return {
        draft: {
          name: 'Medication',
          dosage: 'As prescribed',
          form: 'Tablet',
          instructions: input,
          times: ['08:00'],
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        },
        disclaimer,
        isSimulated: true,
      };
    }
  }

  /**
   * Explain a medication in simple, comforting plain language for the elder
   */
  async explainMedicine(medName: string, dosage: string, lang: Language = 'en'): Promise<{
    explanation: string;
    tips: string[];
    disclaimer: string;
  }> {
    const disclaimer = 'AI-generated, please verify with your doctor or pharmacist. CareCircle does not provide medical diagnoses or dosage advice.';

    const langNames: Record<Language, string> = {
      en: 'English',
      hi: 'Hindi',
      te: 'Telugu',
    };

    if (!this.isAvailable || !this.client) {
      const explanations: Record<Language, string> = {
        en: `${medName} (${dosage}) is commonly prescribed to help maintain your health. Always take it as directed by your doctor.`,
        hi: `${medName} (${dosage}) आमतौर पर आपके स्वास्थ्य को बनाए रखने के लिए दी जाती है। कृपया डॉक्टर के निर्देशानुसार ही लें।`,
        te: `${medName} (${dosage}) సాధారణంగా మీ ఆరోగ్యాన్ని కాపాడటానికి సూచించబడుతుంది. దయచేసి డాక్టర్ సూచించిన విధంగా మాత్రమే తీసుకోండి.`,
      };
      return {
        explanation: explanations[lang] || explanations.en,
        tips: [
          'Take with a full glass of water',
          'Try taking it at the same time every day to build a habit',
          'Store in a cool, dry place away from direct sunlight',
        ],
        disclaimer,
      };
    }

    try {
      const prompt = `Explain what the medication "${medName} (${dosage})" is commonly used for, in very simple, warm, reassuring language for an elderly person.
Language to respond in: ${langNames[lang]}.
Format your response as a JSON object:
{
  "explanation": "2-3 short, clear, reassuring sentences about what the medicine helps with",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}
Strict safety requirement: Do NOT provide specific personal medical advice or change dosages. Remind the reader to consult their healthcare provider.`;

      const response = await this.client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        explanation: parsed.explanation || `${medName} helps manage your daily health.`,
        tips: parsed.tips || ['Take with water at consistent times.'],
        disclaimer,
      };
    } catch (err) {
      logger.error('Gemini explainMedicine error', err);
      return {
        explanation: `${medName} is prescribed by your doctor to support your daily wellness.`,
        tips: ['Take with water as scheduled', 'Keep in a cool and dry place'],
        disclaimer,
      };
    }
  }

  /**
   * Generate a weekly plain-language family health summary
   */
  async generateWeeklyFamilySummary(params: {
    elderName: string;
    adherenceRate: number;
    dosesTaken: number;
    dosesScheduled: number;
    missedDoses: string[];
    upcomingAppointments: string[];
    lang?: Language;
  }): Promise<{ summary: string; highlight: string; disclaimer: string }> {
    const disclaimer = 'AI-generated, please verify with your doctor or pharmacist. CareCircle does not provide medical diagnoses or dosage advice.';

    if (!this.isAvailable || !this.client) {
      return {
        summary: `${params.elderName} had a great week with a ${params.adherenceRate}% medication adherence rate! Out of ${params.dosesScheduled} scheduled doses, ${params.dosesTaken} were taken on time. Keep up the warm encouragement!`,
        highlight: params.adherenceRate >= 90 ? '🌟 Outstanding adherence this week!' : '💛 Gentle reminder check-in recommended.',
        disclaimer,
      };
    }

    try {
      const prompt = `Write a gentle, warm 1-2 paragraph "How did things go this week?" summary for the family members of an elder named ${params.elderName}.
Key statistics:
- Adherence rate: ${params.adherenceRate}%
- Doses taken: ${params.dosesTaken} of ${params.dosesScheduled}
- Missed medications: ${params.missedDoses.join(', ') || 'None'}
- Upcoming appointments: ${params.upcomingAppointments.join(', ') || 'None scheduled'}

Output JSON:
{
  "summary": "Warm, constructive family overview",
  "highlight": "Short 1-sentence positive badge or key takeaway"
}`;

      const response = await this.client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        summary: parsed.summary || `${params.elderName} achieved ${params.adherenceRate}% adherence this week.`,
        highlight: parsed.highlight || 'Good routine maintained.',
        disclaimer,
      };
    } catch (err) {
      logger.error('Gemini weekly summary error', err);
      return {
        summary: `${params.elderName} completed ${params.dosesTaken} of ${params.dosesScheduled} doses (${params.adherenceRate}% adherence) this week.`,
        highlight: 'Routine on track.',
        disclaimer,
      };
    }
  }
}

export const geminiService = new GeminiService();
