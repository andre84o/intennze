export type CustomerStatus = 'lead' | 'contacted' | 'negotiating' | 'customer' | 'churned';
export type ReminderType = 'general' | 'follow_up' | 'service_update' | 'renewal' | 'upsell';
// Mobile Call Companion
export type CallOutcome = 'interested' | 'call_back' | 'no_answer' | 'not_interested';
export type CallSessionState = 'idle' | 'dialing' | 'wrap_up' | 'ended';
export type RecurringInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type InteractionType = 'call' | 'email' | 'meeting' | 'note' | 'sale' | 'other';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
export type LeadSource = 'facebook_ads' | 'google_ads' | 'website' | 'referral' | 'linkedin' | 'instagram' | 'xml_import' | 'other';

// Lead source labels och ikoner
export const leadSourceLabels: Record<LeadSource, string> = {
  facebook_ads: 'Facebook Ads',
  google_ads: 'Google Ads',
  website: 'Webbplats',
  referral: 'Referens',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  xml_import: 'Importerad',
  other: 'Övrigt',
};

export const leadSourceColors: Record<LeadSource, string> = {
  facebook_ads: 'bg-blue-600',
  google_ads: 'bg-red-500',
  website: 'bg-cyan-500',
  referral: 'bg-green-500',
  linkedin: 'bg-blue-700',
  instagram: 'bg-pink-500',
  xml_import: 'bg-slate-500',
  other: 'bg-slate-400',
};

export interface Customer {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  company_name: string | null;
  category: string | null;
  instagram_url: string | null;
  website_url: string | null;
  org_number: string | null;
  contact_person: string | null;
  position: string | null;
  budget: number | null;
  wishes: string | null;
  notes: string | null;
  status: CustomerStatus;
  has_purchased: boolean;
  has_service_agreement: boolean;
  service_type: string | null;
  service_price: number | null;
  service_start_date: string | null;
  service_renewal_date: string | null;
  source: string | null;
  import_batch_id: string | null;
  created_by: string | null;
  // Meta Conversions API
  meta_lead_id: string | null;
  fbclid: string | null;
  // Facebook Lead Ads
  facebook_lead_id: string | null;
  // Notification tracking
  is_read: boolean;
  // Mobile Call Companion — last-call summary
  last_call_at: string | null;
  last_call_result: CallOutcome | null;
}

export interface Reminder {
  id: string;
  created_at: string;
  customer_id: string | null;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  type: ReminderType;
  is_completed: boolean;
  completed_at: string | null;
  is_recurring: boolean;
  recurring_interval: RecurringInterval | null;
  notification_sent: boolean;
  notification_sent_at: string | null;
  created_by: string | null;
  // Joined data
  customer?: Customer;
}

export interface CustomerInteraction {
  id: string;
  created_at: string;
  customer_id: string;
  type: InteractionType;
  description: string;
  created_by: string | null;
  email_id?: string | null;
  // Mobile Call Companion — structured outcome + idempotency key
  call_outcome?: CallOutcome | null;
  request_id?: string | null;
}

export interface CallSession {
  id: string;
  agent_id: string;
  active_customer_id: string | null;
  active_call_id: string | null;
  state: CallSessionState;
  lead_order: string[];
  lead_index: number;
  mobile_last_seen_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  created_at: string;
  customer_id: string;
  product_name: string;
  description: string | null;
  amount: number;
  is_recurring: boolean;
  recurring_interval: RecurringInterval | null;
  created_by: string | null;
}

export interface Quote {
  id: string;
  created_at: string;
  updated_at: string;
  quote_number: number;
  customer_id: string | null;
  title: string;
  description: string | null;
  valid_from: string;
  valid_until: string | null;
  status: QuoteStatus;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  sent_to_email: string | null;
  created_by: string | null;
  // Public access token
  public_token: string | null;
  customer_response_at: string | null;
  customer_response_note: string | null;
  // Joined data
  customer?: Customer;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  created_at: string;
  quote_id: string;
  description: string;
  details: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  sort_order: number;
}

// Form data types
export interface CustomerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  company_name: string;
  category: string;
  instagram_url: string;
  website_url: string;
  org_number: string;
  contact_person: string;
  position: string;
  budget: string;
  wishes: string;
  notes: string;
  status: CustomerStatus;
  has_purchased: boolean;
  has_service_agreement: boolean;
  service_type: string;
  service_price: string;
  service_start_date: string;
  service_renewal_date: string;
  source: string;
}

export interface ReminderFormData {
  customer_id: string;
  title: string;
  description: string;
  reminder_date: string;
  reminder_time: string;
  type: ReminderType;
  is_recurring: boolean;
  recurring_interval: RecurringInterval | '';
}

export interface QuoteItemFormData {
  id?: string;
  description: string;
  details: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

export interface QuoteFormData {
  customer_id: string;
  title: string;
  description: string;
  valid_from: string;
  valid_until: string;
  vat_rate: string;
  notes: string;
  terms: string;
  items: QuoteItemFormData[];
}

// Status labels
export const customerStatusLabels: Record<CustomerStatus, string> = {
  lead: 'Lead',
  contacted: 'Kontaktat',
  negotiating: 'Förhandling',
  customer: 'Kund',
  churned: 'Nej',
};

export const reminderTypeLabels: Record<ReminderType, string> = {
  general: 'Allmän',
  follow_up: 'Uppföljning',
  service_update: 'Mjukvaruuppdatering',
  renewal: 'Förnyelse',
  upsell: 'Merförsäljning',
};

export const interactionTypeLabels: Record<InteractionType, string> = {
  call: 'Samtal',
  email: 'E-post',
  meeting: 'Möte',
  note: 'Anteckning',
  sale: 'Försäljning',
  other: 'Övrigt',
};

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: 'Utkast',
  sent: 'Skickad',
  accepted: 'Accepterad',
  declined: 'Avböjd',
  expired: 'Utgången',
};

// Questionnaire types
export type QuestionnaireStatus = 'sent' | 'opened' | 'completed' | 'expired';

export interface Questionnaire {
  id: string;
  created_at: string;
  customer_id: string;
  public_token: string;
  status: QuestionnaireStatus;
  sent_at: string;
  sent_to_email: string;
  opened_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  // Joined data
  customer?: Customer;
  responses?: QuestionnaireResponse;
}

export interface QuestionnaireResponse {
  id: string;
  created_at: string;
  questionnaire_id: string;
  // Answers
  industry: string | null;
  has_domain: boolean | null;
  domain_name: string | null;
  wants_domain_help: boolean | null;
  wants_maintenance: boolean | null;
  page_count: string | null;
  has_content: boolean | null;
  content_help_needed: string | null;
  features: string[] | null;
  other_features: string | null;
  design_preferences: string | null;
  reference_sites: string | null;
  budget_range: string | null;
  timeline: string | null;
  additional_info: string | null;
}

export const questionnaireStatusLabels: Record<QuestionnaireStatus, string> = {
  sent: 'Skickad',
  opened: 'Öppnad',
  completed: 'Besvarad',
  expired: 'Utgången',
};

// Invoice types
export type InvoiceStatus = 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  created_at: string;
  updated_at: string;
  customer_id: string;
  invoice_number: number;
  invoice_date: string;
  due_date: string;
  period_start: string;
  period_end: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  description: string | null;
  status: InvoiceStatus;
  sent_at: string | null;
  paid_at: string | null;
  service_type: string | null;
  created_by: string | null;
  // Credit note fields
  is_credit_note: boolean;
  original_invoice_id: string | null;
  // Joined data
  customer?: Customer;
}

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  pending: 'Ej skickad',
  sent: 'Skickad',
  paid: 'Betald',
  overdue: 'Förfallen',
  cancelled: 'Makulerad',
};

export const invoiceStatusColors: Record<InvoiceStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

// Code Snippets
export interface CodeSnippet {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  code: string;
  language: string | null;
  tags: string[];
  is_favorite: boolean;
  created_by: string | null;
}
