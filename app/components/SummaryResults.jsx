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

const SummaryResults = ({ text, onSummaryComplete }) => {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const previousTextRef = useRef('');
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);
  
  const getSummary = useCallback(async () => {
    if (!text?.trim() || text.trim() === previousTextRef.current) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const currentRequestId = ++requestIdRef.current;
    previousTextRef.current = text.trim();

    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending summary request for text:', text);

      const response = await axios.post('/api/summarize', 
        { text },
        { 
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Received summary response:', response.data);

      if (response.data.waitTime) {
        setQueuePosition(Math.ceil(response.data.waitTime / 1000));
      }

      if (currentRequestId === requestIdRef.current && response.data.summary) {
        setSummary(response.data.summary);
        onSummaryComplete?.(response.data.summary);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        console.error('Summary error:', err.response ? err.response.data : err.message);
        setError('Failed to get summary. Please try again later.');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
        setQueuePosition(0);
      }
    }
  }, [text, onSummaryComplete]);

  useEffect(() => {
    if (text) {
      getSummary();
    }
  }, [text, getSummary]);

  return (
    <div className="summary-container">
      {isLoading && (
        <div className="loading-indicator">
          {queuePosition > 0 
            ? `Waiting in queue (${queuePosition}s)...`
            : 'Generating summary...'}
        </div>
      )}
      
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
