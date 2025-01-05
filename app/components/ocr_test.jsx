'use client';

import React, { useState } from 'react';
import axios from 'axios';

export default function OCRTest() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [readyToProcess, setReadyToProcess] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setReadyToProcess(file != null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await axios.post('/api/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(response.data.groupedText || []);
    } catch (error) {
      console.error('Error uploading image:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setIsProcessing(false);
      setReadyToProcess(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="ocr-container">
      <div className="upload-section">
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/*"
          disabled={isProcessing}
        />
        <button
          onClick={handleUpload}
          disabled={!readyToProcess || isProcessing}
          className={isProcessing ? 'processing' : ''}
        >
          {isProcessing ? 'Processing...' : 'Process Image'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="results-section">
          {results.map((group, groupIndex) => (
            <div key={groupIndex} className="font-group">
              <h3 className="font-size-header">Font Size: {group.fontSize}pt</h3>
              <div className="words-container">
                {group.words.map((word, wordIndex) => (
                  <div key={wordIndex} className="word-item">
                    <span 
                      className={`word-text ${word.language}`}
                      style={{ fontSize: `${group.fontSize * 0.8}px` }}  // Scale down for display
                    >
                      {word.text}
                    </span>
                    <span className="word-language">({word.language})</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .ocr-container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .upload-section {
          margin-bottom: 20px;
          display: flex;
          gap: 10px;
        }

        .font-group {
          margin-bottom: 30px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }

        .font-size-header {
          color: #333;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #eee;
        }

        .words-container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .word-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .word-text {
          font-family: 'Khmer OS Battambang', Arial, sans-serif;
        }

        .word-text.khm {
          color: #2c5282;
        }

        .word-text.eng {
          color: #2a4365;
        }

        .word-language {
          font-size: 0.8em;
          color: #666;
        }

        button {
          padding: 8px 16px;
          background-color: #4299e1;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        button:disabled {
          background-color: #a0aec0;
          cursor: not-allowed;
        }

        button.processing {
          background-color: #2b6cb0;
        }

        input[type="file"] {
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }

        input[type="file"]:disabled {
          background-color: #edf2f7;
        }
      `}</style>
    </div>
  );
}