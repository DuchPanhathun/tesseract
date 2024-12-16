'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SummaryResults = ({ text }) => {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (text) {
      getSummary(text);
    }
  }, [text]);

  const getSummary = async (text) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/summarize', {
        text: text
      });
      setSummary(response.data.summary);
    } catch (err) {
      console.error('Summary error:', err.response ? err.response.data : err.message);
      setError('Failed to get summary. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

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
