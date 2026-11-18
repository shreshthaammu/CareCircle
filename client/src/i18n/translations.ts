export type Language = 'en' | 'hi' | 'te';

export interface Translations {
  appName: string;
  tagline: string;
  skipToContent: string;
  // Nav
  navDashboard: string;
  navElderMode: string;
  navMedications: string;
  navAppointments: string;
  navSuggestions: string;
  navEmergencyCard: string;
  navSettings: string;
  navLogout: string;
  // Roles
  roleElder: string;
  roleCaretaker: string;
  roleFamily: string;
  // Elder First Mode
  elderModeTitle: string;
  elderModeSubtitle: string;
  actionTodaysMeds: string;
  actionNextAppt: string;
  actionCallSomeone: string;
  noMedsLeftToday: string;
  allDoneToday: string;
  callDoctor: string;
  callFamily: string;
  callCaretaker: string;
  callEmergency: string;
  // Actions
  btnTaken: string;
  btnSkip: string;
  btnSnooze: string;
  btnSave: string;
  btnCancel: string;
  btnAddMedication: string;
  btnScheduleAppointment: string;
  btnApprove: string;
  btnDecline: string;
  btnPrint: string;
  // Adherence
  adherenceTitle: string;
  weeklyRate: string;
  monthlyRate: string;
  currentStreak: string;
  bestStreak: string;
  daysStreak: string;
  calendarHeatmapTitle: string;
  // AI
  aiPrescriptionScanner: string;
  aiNaturalLanguage: string;
  aiExplainMedicine: string;
  aiWeeklySummary: string;
  aiDisclaimer: string;
  // Suggestions
  suggestionsTitle: string;
  pendingReview: string;
  suggestedBy: string;
  // General
  loading: string;
  error: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'CareCircle',
    tagline: 'Keeping Families Connected, Elders Independent & Routines on Track',
    skipToContent: 'Skip to main content',
    navDashboard: 'Dashboard',
    navElderMode: 'Elder View',
    navMedications: 'Medications',
    navAppointments: 'Appointments',
    navSuggestions: 'Suggestions',
    navEmergencyCard: 'Emergency Card',
    navSettings: 'Circle Settings',
    navLogout: 'Sign Out',
    roleElder: 'Elder Member',
    roleCaretaker: 'Caretaker',
    roleFamily: 'Family Member',
    elderModeTitle: "Today's Care",
    elderModeSubtitle: 'Big, easy-to-read healthcare essentials.',
    actionTodaysMeds: "Today's Medicines",
    actionNextAppt: 'Next Doctor Visit',
    actionCallSomeone: 'Call Someone',
    noMedsLeftToday: "You're all set! No remaining medicines for today.",
    allDoneToday: 'All scheduled doses taken for today. Wonderful job!',
    callDoctor: 'Call Doctor',
    callFamily: 'Call Family',
    callCaretaker: 'Call Care Coordinator',
    callEmergency: 'Emergency (911)',
    btnTaken: '✓ I Took It',
    btnSkip: 'Skip Dose',
    btnSnooze: '⏰ Snooze 15 min',
    btnSave: 'Save',
    btnCancel: 'Cancel',
    btnAddMedication: 'Add Medication',
    btnScheduleAppointment: 'Schedule Appointment',
    btnApprove: '✓ Approve Change',
    btnDecline: '✕ Decline',
    btnPrint: 'Print Emergency Card',
    adherenceTitle: 'Medication Adherence & Streaks',
    weeklyRate: 'Weekly Adherence',
    monthlyRate: 'Monthly Adherence',
    currentStreak: 'Current Streak',
    bestStreak: 'Best Streak',
    daysStreak: 'days in a row',
    calendarHeatmapTitle: '30-Day Medication Calendar Heatmap',
    aiPrescriptionScanner: 'Prescription & Strip Scanner',
    aiNaturalLanguage: 'Speak or Type Prescription',
    aiExplainMedicine: 'Explain this Medicine',
    aiWeeklySummary: 'Weekly Health Story',
    aiDisclaimer: 'AI-generated, please verify with your doctor or pharmacist. CareCircle does not provide medical diagnoses or dosage advice.',
    suggestionsTitle: 'Care Changes Awaiting Your Consent',
    pendingReview: 'Pending Consent',
    suggestedBy: 'Suggested by',
    loading: 'Loading your care circle...',
    error: 'An error occurred. Please try again.',
  },
  hi: {
    appName: 'केयरसर्कल',
    tagline: 'परिवारों को जोड़े रखना और बुजुर्गों को स्वस्थ एवं आत्मनिर्भर बनाना',
    skipToContent: 'मुख्य सामग्री पर जाएं',
    navDashboard: 'डैशबोर्ड',
    navElderMode: 'बुजुर्ग दृश्य (बड़ा टेक्स्ट)',
    navMedications: 'दवाइयां',
    navAppointments: 'डॉक्टर से मिलना',
    navSuggestions: 'सुझाव',
    navEmergencyCard: 'आपातकालीन कार्ड',
    navSettings: 'सर्कल सेटिंग्स',
    navLogout: 'लॉग आउट',
    roleElder: 'बुजुर्ग सदस्य',
    roleCaretaker: 'देखभालकर्ता (केयरटेकर)',
    roleFamily: 'परिवार का सदस्य',
    elderModeTitle: 'आज की देखभाल',
    elderModeSubtitle: 'सरल, बड़े अक्षरों में स्वास्थ्य संबंधी जानकारी।',
    actionTodaysMeds: 'आज की दवाइयां',
    actionNextAppt: 'अगली डॉक्टर मुलाकात',
    actionCallSomeone: 'किसी को कॉल करें',
    noMedsLeftToday: 'आज की सभी दवाइयां पूरी हो चुकी हैं!',
    allDoneToday: 'बहुत बढ़िया! आज की सभी दवाइयां ले ली गई हैं।',
    callDoctor: 'डॉक्टर को फोन करें',
    callFamily: 'परिवार को फोन करें',
    callCaretaker: 'केयरटेकर को फोन करें',
    callEmergency: 'आपातकालीन (112)',
    btnTaken: '✓ मैंने ले ली',
    btnSkip: 'छोड़ें',
    btnSnooze: '⏰ 15 मिनट बाद',
    btnSave: 'सहेजें',
    btnCancel: 'रद्द करें',
    btnAddMedication: 'दवा जोड़ें',
    btnScheduleAppointment: 'मुलाकात तय करें',
    btnApprove: '✓ स्वीकार करें',
    btnDecline: '✕ अस्वीकार करें',
    btnPrint: 'कार्ड प्रिंट करें',
    adherenceTitle: 'दवा समयबद्धता एवं स्ट्रीक',
    weeklyRate: 'साप्ताहिक अनुपालन',
    monthlyRate: 'मासिक अनुपालन',
    currentStreak: 'वर्तमान स्ट्रीक',
    bestStreak: 'सर्वश्रेष्ठ स्ट्रीक',
    daysStreak: 'दिन लगातार',
    calendarHeatmapTitle: '30-दिवसीय दवा कैलेंडर हीटमैप',
    aiPrescriptionScanner: 'पर्चा व स्ट्रिप स्कैनर (AI)',
    aiNaturalLanguage: 'बोलकर या लिखकर जोड़ें',
    aiExplainMedicine: 'इस दवा को समझें',
    aiWeeklySummary: 'साप्ताहिक स्वास्थ्य कहानी',
    aiDisclaimer: 'एआई द्वारा उत्पन्न जानकारी। कृपया डॉक्टर या फार्मासिस्ट से पुष्टि करें।',
    suggestionsTitle: 'आपकी सहमति के लिए लंबित सुझाव',
    pendingReview: 'सहमति लंबित',
    suggestedBy: 'सुझावकर्ता',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि हुई। कृपया पुनः प्रयास करें।',
  },
  te: {
    appName: 'కేర్‌సర్కిల్',
    tagline: 'కుటుంబాలను అనుసంధానించడం, పెద్దల ఆరోగ్యాన్ని సురక్షితంగా ఉంచడం',
    skipToContent: 'ప్రధాన విషయానికి వెళ్ళండి',
    navDashboard: 'డ్యాష్‌బోర్డ్',
    navElderMode: 'పెద్దల వీక్షణ (పెద్ద ఫాంట్)',
    navMedications: 'మందులు',
    navAppointments: 'డాక్టర్ అపాయింట్‌మెంట్లు',
    navSuggestions: 'సూచనలు',
    navEmergencyCard: 'అత్యవసర కార్డు',
    navSettings: 'సర్కిల్ సెట్టింగులు',
    navLogout: 'లాగ్ అవుట్',
    roleElder: 'పెద్దలు',
    roleCaretaker: 'సంరక్షకుడు',
    roleFamily: 'కుటుంబ సభ్యుడు',
    elderModeTitle: 'నేటి సంరక్షణ',
    elderModeSubtitle: 'స్పష్టమైన, పెద్ద అక్షరాలతో కూడిన సమాచారం.',
    actionTodaysMeds: 'ఈ రోజు మందులు',
    actionNextAppt: 'తదుపరి డాక్టర్ సందర్శన',
    actionCallSomeone: 'ఫోన్ చేయండి',
    noMedsLeftToday: 'ఈ రోజుకు మందులన్నీ పూర్తయ్యాయి!',
    allDoneToday: 'ఈ రోజు మందులన్నీ సమయానికి వేసుకున్నారు. అభినందనలు!',
    callDoctor: 'డాక్టర్‌కి కాల్ చేయండి',
    callFamily: 'కుటుంబ సభ్యులకు కాల్ చేయండి',
    callCaretaker: 'సంరక్షకుడికి కాల్ చేయండి',
    callEmergency: 'అత్యవసర కాల్ (112)',
    btnTaken: '✓ నేను తీసుకున్నాను',
    btnSkip: 'వదిలేయండి',
    btnSnooze: '⏰ 15 నిమిషాలు స్నూజ్',
    btnSave: 'సేవ్ చేయండి',
    btnCancel: 'రద్దు చేయండి',
    btnAddMedication: 'మందును జోడించండి',
    btnScheduleAppointment: 'అపాయింట్‌మెంట్ నమోదు చేయండి',
    btnApprove: '✓ అంగీకరించండి',
    btnDecline: '✕ తిరస్కరించండి',
    btnPrint: 'కార్డును ప్రింట్ చేయండి',
    adherenceTitle: 'మందుల నియమితత మరియు స్ట్రీక్',
    weeklyRate: 'వారపు పాటించటం',
    monthlyRate: 'నెలవారీ పాటించటం',
    currentStreak: 'ప్రస్తుత స్ట్రీక్',
    bestStreak: 'ఉత్తమ స్ట్రీక్',
    daysStreak: 'రోజులు వరుసగా',
    calendarHeatmapTitle: '30-రోజుల మందుల క్యాలెండర్ హీట్‌మ్యాప్',
    aiPrescriptionScanner: 'ప్రిస్క్రిప్షన్ స్కానర్ (AI)',
    aiNaturalLanguage: 'వాయిస్ లేదా టెక్స్ట్ ద్వారా జోడించండి',
    aiExplainMedicine: 'ఈ మందు గురించి తెలుసుకోండి',
    aiWeeklySummary: 'వారం వారీ ఆరోగ్య కథనం',
    aiDisclaimer: 'AI-సృష్టించిన సమాచారం, దయచేసి మీ డాక్టర్ లేదా ఫార్మసిస్ట్‌తో నిర్ధారించుకోండి.',
    suggestionsTitle: 'మీ ఆమోదం కోసం వేచి ఉన్న మార్పులు',
    pendingReview: 'ఆమోదం కోసం పెండింగ్‌లో ఉంది',
    suggestedBy: 'సూచించిన వారు',
    loading: 'లోడ్ అవుతోంది...',
    error: 'లోపం సంభవించింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
  },
};
