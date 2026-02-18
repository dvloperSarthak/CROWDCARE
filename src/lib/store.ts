import { Child, RescueAlert } from './types';

// Initial Mock Data
const INITIAL_CHILDREN: Child[] = [
  {
    id: 'C2045',
    name: 'Aiden Smith',
    parentName: 'Sarah Smith',
    parentPhone: '+1 (555) 0123',
    emergencyContact: '+1 (555) 9876',
    registeredAt: new Date().toISOString(),
  },
  {
    id: 'C2046',
    name: 'Leo Garcia',
    parentName: 'Maria Garcia',
    parentPhone: '+1 (555) 0456',
    registeredAt: new Date().toISOString(),
  }
];

// In-memory simulation of a database
let children: Child[] = [...INITIAL_CHILDREN];
let alerts: RescueAlert[] = [];

export const DataStore = {
  getChildren: () => children,
  addChild: (child: Child) => {
    children = [child, ...children];
    return child;
  },
  getChildById: (id: string) => children.find(c => c.id === id),
  
  getAlerts: () => alerts,
  addAlert: (alert: RescueAlert) => {
    alerts = [alert, ...alerts];
    return alert;
  },
  updateAlertStatus: (alertId: string, status: RescueAlert['status']) => {
    alerts = alerts.map(a => a.alertId === alertId ? { ...a, status } : a);
  }
};