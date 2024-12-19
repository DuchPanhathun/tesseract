'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import '../style/ImageUploader.css'

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

const TranslateResults = ({ text, sourceLang = 'kh', targetLang = 'eng', onTranslationComplete }) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);
  const [translatedText, setTranslatedText] = useState('');
  const [queuePosition, setQueuePosition] = useState(0);
  const previousTextRef = useRef('');
  const translationInProgressRef = useRef(false);

  const performTranslation = useCallback(async () => {
    if (translationInProgressRef.current || 
        text === previousTextRef.current || 
        !text?.trim()) {
      return;
    }

    translationInProgressRef.current = true;
    setIsTranslating(true);
    setError(null);

    try {
      const response = await axios.post('/api/translate', {
        src_lang: sourceLang,
        tgt_lang: targetLang,
        input_text: [text]
      });

      if (response.data.waitTime) {
        setQueuePosition(Math.ceil(response.data.waitTime / 1000));
      }

      const translated = response.data.translate_text?.[0] || response.data.tgt_text?.[0];
      if (translated) {
        onTranslationComplete(translated);
        previousTextRef.current = text;
        setTranslatedText(translated);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      console.error('Translation error:', errorMessage, err);
      setError(`Translation failed: ${errorMessage}`);
    } finally {
      setIsTranslating(false);
      translationInProgressRef.current = false;
      setQueuePosition(0);
    }
  }, [text, sourceLang, targetLang, onTranslationComplete]);

  useEffect(() => {
    performTranslation();
  }, [performTranslation]);

  return (
    <div className="translation-container">
      <div className="translation-header">
        <div className="translation-languages">
          {sourceLang.toUpperCase()} → {targetLang.toUpperCase()}
        </div>
        {isTranslating && (
          <div className="translating-indicator">
            <div className="translation-spinner"></div>
            {queuePosition > 0 ? 
              `Waiting in queue (${queuePosition}s)...` : 
              'Translating...'}
          </div>
        )}
      </div>

      {error ? (
        <div className="translation-error">
          <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12" y2="16" />
          </svg>
          {error}
        </div>
      ) : (
        <div className="translated-text">
          <h4>Translation</h4>
          <pre>{translatedText}</pre>
        </div>
      )}
    </div>
  );
};

export default TranslateResults;