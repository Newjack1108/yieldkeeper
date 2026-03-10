/**
 * Pre-checklist and quarterly checklist question definitions.
 * Centralised for consistency; can be moved to DB later for customisation.
 */

export type ChecklistQuestionType = "yes_no" | "yes_no_with_notes";

export type PreChecklistQuestion = {
  id: string;
  label: string;
  type: ChecklistQuestionType;
  required?: boolean;
};

export type QuarterlyChecklistQuestion = {
  id: string;
  label: string;
  type: ChecklistQuestionType;
  required?: boolean;
};

/** Pre-checklist questions for yearly inspection */
export const PRE_CHECKLIST_QUESTIONS: PreChecklistQuestion[] = [
  { id: "access_confirmed", label: "Access confirmed for the scheduled date?", type: "yes_no", required: true },
  { id: "any_pets", label: "Any pets in the property?", type: "yes_no", required: true },
  { id: "repairs_to_report", label: "Any repairs or issues to report?", type: "yes_no_with_notes", required: false },
  { id: "smoke_alarms_ok", label: "Smoke alarms tested and working?", type: "yes_no", required: true },
  { id: "property_condition", label: "Property generally in good condition?", type: "yes_no", required: true },
];

/** Quarterly checklist questions (yes/no property condition check) */
export const QUARTERLY_CHECKLIST_QUESTIONS: QuarterlyChecklistQuestion[] = [
  { id: "clean_tidy", label: "Is the property generally clean and tidy?", type: "yes_no", required: true },
  { id: "appliances_working", label: "Are all appliances working?", type: "yes_no", required: true },
  { id: "damp_mold", label: "Any signs of damp or mold?", type: "yes_no", required: true },
  { id: "smoke_alarms_working", label: "Are smoke alarms working?", type: "yes_no", required: true },
  { id: "maintenance_needed", label: "Any maintenance needed?", type: "yes_no_with_notes", required: false },
];

export type PreChecklistAnswers = Record<string, string | boolean>;

export type QuarterlyChecklistAnswers = Record<string, string | boolean>;
