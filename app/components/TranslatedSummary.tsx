import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/OverallSummary.css';

const TranslatedSummary = ({ originalSummary }: { originalSummary: string }) => {
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTranslated, setHasTranslated] = useState(false);

  const translateText = async () => {
    if (!originalSummary?.trim() || hasTranslated) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/translated', {
        text: originalSummary
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setTranslatedText(response.data.translatedText);
      setHasTranslated(true);
    } catch (err) {
      console.error('Translation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to translate text');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (originalSummary && !hasTranslated) {
      translateText();
    }
  }, [originalSummary]);

  useEffect(() => {
    setHasTranslated(false);
  }, [originalSummary]);

  return (
    <div className="translated-summary-container">
      {isLoading && (
        <div className="loading-indicator">
          <span className="spinner"></span>
          <span>បកប្រែ...</span>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {translatedText && (
        <div className="summary-content">
          <h4 className="summary-title">ការសង្ខេបជាភាសាខ្មែរ</h4>
          <div className="summary-text khmer-text">
            {translatedText}
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslatedSummary; 