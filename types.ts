export enum Sender {
  BOT = 'bot',
  USER = 'user',
  SYSTEM = 'system'
}

export enum ReportCategory {
  STRUCTURE = 'Rachaduras e Estruturas',
  FLOODING = 'Alagamentos e Enchentes',
  LANDSLIDE = 'Deslizamentos e Encostas',
  INFRASTRUCTURE = 'Riscos em Infraestrutura',
  INDOOR = 'Dentro de Casa',
  EXTREME = 'Sinais Climáticos Extremos',
  OTHER = 'Outro'
}

export interface QuickReplyOption {
  label: string;
  value: string;
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: Date;
  isQuickReply?: boolean;
  options?: QuickReplyOption[];
  isLocationRequest?: boolean;
  image?: string; // Base64 or URL
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Report {
  id: string;
  category: ReportCategory | string;
  subcategory?: string; // Added to store the specific issue
  description: string;
  location: Coordinates;
  neighborhood?: string;
  timestamp: Date;
  severity: number; // 1-5
  aiAnalysis: string;
  status: 'pending' | 'verified' | 'resolved';
  imageUrl?: string;
}

export interface AiResponse {
  text: string;
  severity: number;
  category?: string;
}

export interface LocationExtractionResponse {
  neighborhood: string;
  coordinates: Coordinates;
  confirmationText: string;
}