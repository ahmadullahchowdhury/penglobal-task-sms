// Single currency for the whole app (see DECISIONS.md, section 3).
export const CURRENCY = "GBP";
export const CURRENCY_LOCALE = "en-GB";
export const MINOR_UNITS_PER_MAJOR = 100;

export const STUDENT_NUMBER_PREFIX = "SMS";

// Classification thresholds, lowest score that earns each label.
export const DISTINCTION_MIN = 70;
export const MERIT_MIN = 60;
export const PASS_MIN = 40;

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

// Date of birth must be in the past and give an age in this range.
export const MIN_STUDENT_AGE = 16;
export const MAX_STUDENT_AGE = 100;

export const ACADEMIC_YEAR_MIN = 2000;
export const ACADEMIC_YEAR_MAX = 2100;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Uploads: PDF and DOCX only, up to 10 MB.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
