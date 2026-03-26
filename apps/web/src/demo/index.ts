import api from '@/services/api';
import { demoAdapter } from './adapter';
import { initDemoState } from './init';

/**
 * Wire the demo adapter into the Axios instance and auto-login.
 * Call this BEFORE React renders.
 */
export function setupDemoMode(): void {
  // Replace the Axios transport with our mock adapter
  api.defaults.adapter = demoAdapter;

  // Auto-populate stores so the app starts authenticated
  initDemoState();

  console.log(
    '%c[Trackly Demo Mode] %cAll API calls are using in-memory mock data.',
    'color: #3B82F6; font-weight: bold;',
    'color: inherit;'
  );
}
