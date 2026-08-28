import { useEffect, useState } from 'react';
import { registerUaePassRedirectRestore } from '@/utils/uaePassLoginFlow';

export const useUaePassRedirectLoading = () => {
  const [loading, setLoading] = useState(false);

  useEffect(
    () => registerUaePassRedirectRestore(() => setLoading(false)),
    [],
  );

  return [loading, setLoading] as const;
};
