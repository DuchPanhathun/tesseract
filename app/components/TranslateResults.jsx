'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../style/ImageUploader.css'

const TranslateResults = ({ text, sourceLang = 'kh', targetLang = 'eng' }) => {
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    console.log('TranslateResults component mounted or updated');
    if (text) {
      translateText();
    }
  }, [text]);

  const getSummary = async (translatedText) => {
    try {
      const response = await axios.post('/api/summarize', {
        text: translatedText
      });
      setSummary(response.data.summary);
    } catch (err) {
      console.error('Summary error:', err.response ? err.response.data : err.message);
      setError('Failed to get summary. Please try again later.');
    }
  };

  const translateText = async () => {
    if (!text) {
      setError('No text to translate');
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      console.log('Sending text for translation:', text);

      const response = await axios.post('/api/translate', {
        src_lang: sourceLang,
        tgt_lang: targetLang,
        input_text: [text]
      });

      console.log('Translation response:', response.data);

      console.log('Full response:', response);

      if (response.data && response.data.tgt_text && Array.isArray(response.data.tgt_text)) {
        const translatedText = response.data.tgt_text[0];
        setTranslatedText(translatedText);
        await getSummary(translatedText);
      } else {
        console.error('Invalid response structure:', response.data);
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.details || err.message;
      console.error('Translation error:', err);
      setError(`Translation failed: ${errorMessage}`);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="translation-container">
      {isTranslating && (
        <div className="translating-indicator">
          Translating...
        </div>
      )}
      
      {error && (
        <div className="translation-error">
          {error}
        </div>
      )}
      
      {translatedText && (
        <div className="translated-text">
          <h4>Translated Text:</h4>
          <pre>{translatedText}</pre>
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

export default TranslateResults;