import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/OverallSummary.css';

const OverallSummary = ({ summaries }) => {
  const [combinedSummary, setCombinedSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCombinedSummary = async () => {
    if (!summaries || summaries.length === 0) {
      setError('No summaries available to combine');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Filter out any empty summaries
      const validSummaries = summaries.filter(summary => summary?.trim());
      
      if (validSummaries.length === 0) {
        throw new Error('No valid summaries to combine');
      }

      console.log('Sending summaries for combination:', validSummaries); // Debug log

      const response = await axios.post('/api/combine-summaries', { 
        summaries: validSummaries 
      });

      console.log('Combined summary response:', response.data); // Debug log

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setCombinedSummary(response.data.summary);
    } catch (err) {
      console.error('Combined summary error:', err);
      setError(err.message || 'Failed to generate combined summary');
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically generate combined summary when summaries change
  useEffect(() => {
    if (summaries && summaries.length > 0) {
      getCombinedSummary();
    }
  }, [summaries]);

  return (
    <div className="overall-summary-container">
      <div className="overall-summary-header">
        <button 
          onClick={getCombinedSummary}
          disabled={isLoading || !summaries || summaries.length === 0}
          className={`combine-btn ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Generating...
            </>
          ) : 'Regenerate Overall Summary'}
        </button>
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <span className="spinner"></span>
          <span>Generating overall summary...</span>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {combinedSummary && (
        <div className="summary-content">
          <h4 className="summary-title">Overall Summary</h4>
          <div className="summary-text">
            {combinedSummary}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverallSummary; 