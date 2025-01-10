'use client';

import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import OCRTest from './ocr_test';

const BarSelector = () => {
  const [selectedComponent, setSelectedComponent] = useState('summary'); // Default to summary view

  return (
    <div className="selector-container">
      <div className="button-bar">
        <button
          className={`selector-button ${selectedComponent === 'summary' ? 'active' : ''}`}
          onClick={() => setSelectedComponent('summary')}
        >
          Summary Article
        </button>
        <button
          className={`selector-button ${selectedComponent === 'ocr' ? 'active' : ''}`}
          onClick={() => setSelectedComponent('ocr')}
        >
          Full OCR
        </button>
      </div>

      <div className="component-container">
        {selectedComponent === 'summary' ? <ImageUploader /> : <OCRTest />}
      </div>

      <style jsx>{`
        .selector-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .button-bar {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 30px;
        }

        .selector-button {
          padding: 12px 24px;
          font-size: 16px;
          border: 2px solid #0070f3;
          border-radius: 8px;
          background: transparent;
          color: #0070f3;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .selector-button:hover {
          background: #0070f3;
          color: white;
        }

        .selector-button.active {
          background: #0070f3;
          color: white;
        }

        .component-container {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default BarSelector; 