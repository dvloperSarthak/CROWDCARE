export type RescueStatus = 'Scanned' | 'Processing' | 'Parent Notified' | 'Child Reunited';

export interface Child {
  id: string; // Unique ID (e.g. C2045)
  name: string;
  parentName: string;
  parentPhone: string;
  emergencyContact?: string;
  registeredAt: string;
}

export interface RescueAlert {
  alertId: string;
  childId: string;
  location: string; // "Lat, Lng"
  timestamp: string;
  status: RescueStatus;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

export interface Volunteer {
  id: string;
  name: string;
  badgeId: string;
}