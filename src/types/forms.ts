/**
 * Form field configuration
 */
export interface FormFieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  type?: 'text' | 'email' | 'number' | 'tel' | 'url' | 'password' | 'date' | 'time' | 'datetime-local';
}

/**
 * Select option
 */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: string;
}

/**
 * Radio option
 */
export interface RadioOption<T = string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Checkbox option
 */
export interface CheckboxOption<T = string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

/**
 * File input constraints
 */
export interface FileInputConstraints {
  accept?: string; // MIME types or file extensions
  maxSize?: number; // in bytes
  maxFiles?: number;
  minFiles?: number;
}

/**
 * Currency input options
 */
export interface CurrencyInputOptions {
  currency?: string; // ISO 4217 currency code
  locale?: string;
  allowNegative?: boolean;
  decimalPlaces?: number;
}

/**
 * Phone input options
 */
export interface PhoneInputOptions {
  defaultCountry?: string; // ISO 3166-1 alpha-2 country code
  preferredCountries?: string[];
  onlyCountries?: string[];
}

/**
 * Date picker options
 */
export interface DatePickerOptions {
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  disabledDays?: number[]; // 0-6 (Sunday-Saturday)
  format?: string;
}

/**
 * Time picker options
 */
export interface TimePickerOptions {
  minTime?: string; // HH:mm
  maxTime?: string; // HH:mm
  step?: number; // minutes
  format?: '12h' | '24h';
}

/**
 * Form section
 */
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: string[]; // field names
}

/**
 * Form configuration
 */
export interface FormConfig {
  id: string;
  title?: string;
  description?: string;
  sections?: FormSection[];
  submitLabel?: string;
  cancelLabel?: string;
  showReset?: boolean;
  resetLabel?: string;
}

/**
 * Form validation error
 */
export interface FormValidationError {
  field: string;
  message: string;
  type?: string;
}

/**
 * Form autosave options
 */
export interface FormAutosaveOptions {
  enabled?: boolean;
  debounceMs?: number;
  storageKey?: string;
  onSave?: (data: any) => void;
  onRestore?: (data: any) => void;
}
