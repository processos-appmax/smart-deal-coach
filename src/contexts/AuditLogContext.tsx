import React, { createContext, useContext, useCallback, useRef } from 'react';
import type { UserRole } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────

export type AuditEventType = 'login' | 'logout' | 'page_view';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  userId: string;
  userName: string;
  userRole: UserRole;
  userEmail: string;
  /** For page_view: the pathname. For login/logout: empty string */
  page: string;
  /** Human-readable page label */
  pageLabel: string;
  timestamp: string; // ISO
  /** IP-like session ID (random per session) */
  sessionId: string;
}

interface AuditLogContextType {
  getLogs: () => AuditEvent[];
  addEvent: (event: Omit<AuditEvent, 'id' | 'timestamp' | 'sessionId'>) => void;
  clearLogs: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'appmax_audit_logs';
const MAX_ENTRIES = 2000;

const SESSION_ID = Math.random().toString(36).slice(2, 10).toUpperCase();

function loadLogs(): AuditEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuditEvent[]) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: AuditEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_ENTRIES)));
  } catch {
    // storage full – ignore
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Context ────────────────────────────────────────────────────────────────

const AuditLogContext = createContext<AuditLogContextType | null>(null);

export function AuditLogProvider({ children }: { children: React.ReactNode }) {
  // Keep a ref so callbacks never become stale
  const logsRef = useRef<AuditEvent[]>(loadLogs());

  const getLogs = useCallback((): AuditEvent[] => {
    logsRef.current = loadLogs();
    return logsRef.current;
  }, []);

  const addEvent = useCallback(
    (event: Omit<AuditEvent, 'id' | 'timestamp' | 'sessionId'>) => {
      const entry: AuditEvent = {
        ...event,
        id: uid(),
        timestamp: new Date().toISOString(),
        sessionId: SESSION_ID,
      };
      const logs = loadLogs();
      saveLogs([entry, ...logs]);
      logsRef.current = [entry, ...logs];
    },
    [],
  );

  const clearLogs = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    logsRef.current = [];
  }, []);

  return (
    <AuditLogContext.Provider value={{ getLogs, addEvent, clearLogs }}>
      {children}
    </AuditLogContext.Provider>
  );
}

export function useAuditLog() {
  const ctx = useContext(AuditLogContext);
  if (!ctx) throw new Error('useAuditLog must be used inside AuditLogProvider');
  return ctx;
}
