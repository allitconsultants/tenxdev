export type ServiceType =
  | 'ai-development'
  | 'infrastructure'
  | 'devops'
  | 'cloud'
  | 'platform'
  | 'consulting';

export interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  service: ServiceType;
  message: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
}
