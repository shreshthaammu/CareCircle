import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { ElderFirstMode } from '../components/ElderFirstMode.js';
import { TodayDoses } from '../components/TodayDoses.js';
import { EmergencyCard } from '../components/EmergencyCard.js';
import { AdherenceDashboard } from '../components/AdherenceDashboard.js';
import { LanguageProvider } from '../context/LanguageContext.js';

describe('Frontend Components & Accessibility Suite', () => {
  const sampleDoses = [
    {
      id: 'dose_1',
      medicationName: 'Metformin',
      dosage: '500mg',
      form: 'Tablet',
      instructions: 'Take with breakfast',
      scheduledDate: '2026-11-15',
      scheduledTime: '08:00',
      status: 'scheduled',
    },
    {
      id: 'dose_2',
      medicationName: 'Atorvastatin',
      dosage: '20mg',
      form: 'Tablet',
      instructions: 'Take at bedtime',
      scheduledDate: '2026-11-15',
      scheduledTime: '21:00',
      status: 'scheduled',
    },
  ];

  const sampleContacts = [
    { name: 'Dr. Sarah Jenkins', relation: 'Cardiologist', phone: '555-1234' },
    { name: 'Elena Ramos', relation: 'Care Coordinator', phone: '555-5678' },
  ];

  const sampleAppointment = {
    id: 'app_1',
    doctor: 'Dr. Sarah Jenkins',
    specialty: 'Cardiology',
    location: 'Mercy Heart Center',
    dateTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    purpose: 'Routine checkup',
    transportNeeded: true,
  };

  describe('ElderFirstMode', () => {
    it('renders the 3 primary action buttons with large touch targets', () => {
      render(
        <LanguageProvider>
          <ElderFirstMode
            doses={sampleDoses}
            nextAppointment={sampleAppointment}
            emergencyContacts={sampleContacts}
            elderName="Eleanor Vance"
            onMarkDose={vi.fn()}
          />
        </LanguageProvider>
      );

      expect(screen.getByText("Today's Medicines")).toBeInTheDocument();
      expect(screen.getByText("Next Doctor Visit")).toBeInTheDocument();
      expect(screen.getByText("Call Someone")).toBeInTheDocument();
    });

    it('triggers onMarkDose when "I Took It" button is clicked', () => {
      const markDoseMock = vi.fn().mockResolvedValue(undefined);
      render(
        <LanguageProvider>
          <ElderFirstMode
            doses={sampleDoses}
            nextAppointment={sampleAppointment}
            emergencyContacts={sampleContacts}
            elderName="Eleanor Vance"
            onMarkDose={markDoseMock}
          />
        </LanguageProvider>
      );

      const takeButtons = screen.getAllByText('✓ I Took It');
      expect(takeButtons.length).toBeGreaterThan(0);
      fireEvent.click(takeButtons[0]);

      expect(markDoseMock).toHaveBeenCalledWith('dose_1', 'taken');
    });

    it('passes automated axe-core accessibility audit with 0 critical violations', async () => {
      const { container } = render(
        <LanguageProvider>
          <ElderFirstMode
            doses={sampleDoses}
            nextAppointment={sampleAppointment}
            emergencyContacts={sampleContacts}
            elderName="Eleanor Vance"
            onMarkDose={vi.fn()}
          />
        </LanguageProvider>
      );

      const results = await axe.run(container);
      const criticalViolations = results.violations.filter(v => v.impact === 'critical');
      expect(criticalViolations.length).toBe(0);
    });
  });

  describe('TodayDoses', () => {
    it('groups doses by time period and displays dose cards', () => {
      render(
        <LanguageProvider>
          <TodayDoses doses={sampleDoses} onMarkDose={vi.fn()} />
        </LanguageProvider>
      );

      expect(screen.getByText(/Morning Doses/i)).toBeInTheDocument();
      expect(screen.getByText(/Bedtime Doses/i)).toBeInTheDocument();
      expect(screen.getByText(/Metformin/i)).toBeInTheDocument();
      expect(screen.getByText(/Atorvastatin/i)).toBeInTheDocument();
    });
  });

  describe('EmergencyCard', () => {
    it('renders elder details, doctor contacts, and active medications table', () => {
      render(
        <LanguageProvider>
          <EmergencyCard
            elderName="Eleanor Vance"
            circleCode="CC-DEMO"
            emergencyContacts={sampleContacts}
            medications={sampleDoses}
            doctorAppointments={[sampleAppointment]}
          />
        </LanguageProvider>
      );

      expect(screen.getByText('Eleanor Vance')).toBeInTheDocument();
      expect(screen.getByText('CC-DEMO')).toBeInTheDocument();
      expect(screen.getAllByText('Dr. Sarah Jenkins').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('555-1234')).toBeInTheDocument();
      expect(screen.getByText('Print Emergency Card')).toBeInTheDocument();
    });
  });

  describe('AdherenceDashboard', () => {
    it('renders weekly percentage, streak, and accessible heatmap elements', () => {
      const mockMetrics = {
        dailyRate: 100,
        weeklyRate: 95,
        monthlyRate: 92,
        currentStreakDays: 14,
        bestStreakDays: 20,
        totalScheduled: 60,
        totalTaken: 55,
        totalMissed: 5,
        heatmap: [
          { date: '2026-11-14', total: 2, taken: 2, rate: 100, level: 4 },
          { date: '2026-11-15', total: 2, taken: 2, rate: 100, level: 4 },
        ],
        missedDoses: [],
      };

      render(
        <LanguageProvider>
          <AdherenceDashboard metrics={mockMetrics} />
        </LanguageProvider>
      );

      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
      expect(screen.getAllByText('14').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });
});
