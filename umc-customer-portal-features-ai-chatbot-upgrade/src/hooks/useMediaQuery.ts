import { useState, useEffect, useCallback } from 'react';

const useMediaQuery = (query: string | string[], initialValue = false) => {
  const [matches, setMatches] = useState(initialValue);

  const getMatches = useCallback((query: string | string[]) => {
    if (typeof window === 'undefined') return initialValue;
    const queries = Array.isArray(query) ? query : [query];
    return queries.every(q => window.matchMedia(q).matches);
  }, [initialValue]);

  const handleChange = useCallback(() => {
    setMatches(getMatches(query));
  }, [getMatches, query]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const queries = Array.isArray(query) ? query : [query];
    const mediaLists = queries.map(q => window.matchMedia(q));
    
    setMatches(getMatches(query));
    
    mediaLists.forEach(ml => ml.addEventListener('change', handleChange));
    return () => {
      mediaLists.forEach(ml => ml.removeEventListener('change', handleChange));
    };
  }, [query, getMatches, handleChange]);

  return matches;
};

export default useMediaQuery;