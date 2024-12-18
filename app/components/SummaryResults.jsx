'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const SummaryResults = ({ text }) => {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const previousTextRef = useRef('');
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);
  
  // Debounce the input text
  const debouncedText = useDebounce(text, 500);

  const getSummary = useCallback(async () => {
    // Skip if text hasn't changed or is empty
    if (!debouncedText?.trim() || debouncedText === previousTextRef.current) {
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const currentRequestId = ++requestIdRef.current;
    previousTextRef.current = debouncedText;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/summarize', 
        { 
          text: debouncedText,
          requestId: currentRequestId // Add request ID to help debug
        },
        { signal: abortControllerRef.current.signal }
      );

      // Only update if this is still the most recent request
      if (currentRequestId === requestIdRef.current) {
        setSummary(response.data.summary);
      }
    } catch (err) {
      // Only show error if this is still the most recent request
      if (currentRequestId === requestIdRef.current) {
        console.error('Summary error:', err.response ? err.response.data : err.message);
        setError('Failed to get summary. Please try again later.');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedText]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      getSummary();
    }, 100); // Add small delay to prevent rapid consecutive calls

    return () => clearTimeout(timeoutId);
  }, [getSummary]);

  return (
    <div className="summary-container">
      {isLoading && <div className="loading-indicator">Generating summary...</div>}
      
      {error && (
        <div className="summary-error">
          {error}
        </div>
      )}

      {summary && (
        <div className="summary-text">
          <h4>Summary:</h4>
          <pre>{summary}</pre>
        </div>
      )}
    </div>
  );
};

export default SummaryResults;
