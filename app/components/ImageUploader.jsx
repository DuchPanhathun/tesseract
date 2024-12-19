'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import CameraCapture from './CameraCapture';
import '../styles/ImageUploader.css';
import TranslateResults from './TranslateResults';
import SummaryResults from './SummaryResults';
import OverallSummary from './OverallSummary';

const ImageUploader = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showUploadMore, setShowUploadMore] = useState(false);
  const [readyToProcess, setReadyToProcess] = useState(false);
  const [translatedTexts, setTranslatedTexts] = useState({});
  const [summaries, setSummaries] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setReadyToProcess(true);
      event.target.value = ''; // Reset file input after selection
    }
  };
  

  const processFiles = async () => {
    setIsLoading(true);
    setShowUploadMore(false);
    setReadyToProcess(false);
    
    for (const file of selectedFiles) {
      await handleFileUpload(file);
    }
    
    setIsLoading(false);
    setShowUploadMore(true);
    setSelectedFiles([]); // Clear the files after processing
  };

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post('/api/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(prev => [...prev, { file: file.name, text: response.data.text }]);
    } catch (error) {
      console.error('Error uploading image:', error);
      setResults(prev => [...prev, { file: file.name, text: 'Error processing image' }]);
    }
  };

  const handleDownload = () => {
    if (results.length > 0) {
      const combinedText = results.map(r => `File: ${r.file}\n${r.text}\n\n`).join('---\n');
      const blob = new Blob([combinedText], { type: 'application/msword' });
      saveAs(blob, 'ocr_results.doc');
    }
  };

  const toggleCamera = () => {
    setShowCamera(!showCamera);
  };

  return (
    <div className="container">
      <div className="wrapper">
        <h2 className="title">Image Text Extractor</h2>
        <div className="content">
          <div className="upload-section">
            <div className="file-input-wrapper">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                multiple
                className="file-input"
              />
            </div>
            <button
              onClick={toggleCamera}
              className="camera-button"
            >
              {showCamera ? 'Hide Camera' : 'Use Camera'}
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="selected-files">
              <h4>Selected Files ({selectedFiles.length}):</h4>
              <ul>
                {selectedFiles.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}

          {readyToProcess && !isLoading && (
            <div className="process-section">
              <button 
                onClick={processFiles}
                className="process-button"
              >
                Process {selectedFiles.length} Files
              </button>
            </div>
          )}

          {showCamera && (
            <div className="camera-container">
              <CameraCapture 
                onCapture={(file) => {
                  setSelectedFiles(prev => [...prev, file]);
                  setReadyToProcess(true);
                }} 
              />
            </div>
          )}

          {isLoading && (
            <div className="loading">
              <div className="spinner"></div>
              <p className="loading-text">Processing images...</p>
            </div>
          )}
          
          {results.length > 0 && (
            <div className="results-section">
              <div className="results-header">
                <h3 className="results-title">OCR Results</h3>
                <button onClick={handleDownload} className="download-button">
                  <svg className="download-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Results
                </button>
              </div>
              
              <div className="results-list">
                {results.map((result, index) => (
                  <div key={index} className="result-item">
                    <div className="result-content">
                      <h4 className="result-filename">{result.file}</h4>
                      <div className="text-sections">
                        <div className="ocr-section">
                          <h5>OCR Text:</h5>
                          <pre className="result-text">{result.text}</pre>
                        </div>
                        <TranslateResults 
                          text={result.text} 
                          onTranslationComplete={(translatedText) => {
                            setTranslatedTexts(prev => ({
                              ...prev,
                              [result.file]: translatedText
                            }));
                          }}
                        />
                        {translatedTexts[result.file] && (
                          <SummaryResults 
                            text={translatedTexts[result.file]} 
                            onSummaryComplete={(summary) => {
                              setSummaries(prev => ({
                                ...prev,
                                [result.file]: summary
                              }));
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showUploadMore && !isLoading && (
            <div className="upload-more-prompt">
              <p>Would you like to upload more files?</p>
              <div className="upload-more-buttons">
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    multiple
                    className="file-input"
                  />
                  <button className="upload-more-button">Yes, Upload More</button>
                </div>
                <button 
                  className="finish-button"
                  onClick={() => setShowUploadMore(false)}
                >
                  No, I'm Done
                </button>
              </div>
            </div>
          )}
          {Object.keys(summaries).length > 1 && (
            <div className="overall-summary-section">
              <h3>Overall Summary</h3>
              <OverallSummary 
                summaries={Object.values(summaries)} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;