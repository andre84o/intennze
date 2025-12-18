export type CustomerStatus = 'lead' | 'contacted' | 'negotiating' | 'customer' | 'churned';
export type ReminderType = 'general' | 'follow_up' | 'service_update' | 'renewal' | 'upsell';
export type RecurringInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type InteractionType = 'call' | 'email' | 'meeting' | 'note' | 'sale' | 'other';

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
  company_name: string | null;
  org_number: string | null;
  budget: number | null;
  wishes: string | null;
  notes: string | null;
  status: CustomerStatus;
  has_purchased: boolean;
  has_service_agreement: boolean;
  service_type: string | null;
  service_start_date: string | null;
  service_renewal_date: string | null;
  source: string | null;
  created_by: string | null;
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

// Form data types
export interface CustomerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  company_name: string;
  org_number: string;
  budget: string;
  wishes: string;
  notes: string;
  status: CustomerStatus;
  has_purchased: boolean;
  has_service_agreement: boolean;
  service_type: string;
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

// Status labels
export const customerStatusLabels: Record<CustomerStatus, string> = {
  lead: 'Lead',
  contacted: 'Kontaktad',
  negotiating: 'Förhandlar',
  customer: 'Kund',
  churned: 'Avslutad',
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
