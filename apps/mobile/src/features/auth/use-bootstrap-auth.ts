import { useEffect } from 'react';

import { bootstrapAuth } from './auth-service';

export function useBootstrapAuth() {
  useEffect(() => bootstrapAuth(), []);
}