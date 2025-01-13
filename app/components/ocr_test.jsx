'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import "../styles/ocr_test.css"

export default function OCRTest() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [readyToProcess, setReadyToProcess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setReadyToProcess(true);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setReadyToProcess(true);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await axios.post('/api/font-position', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(response.data.words || []);

      // Handle DOCX download
      if (response.data.docxFile) {
        const blob = new Blob(
          [Buffer.from(response.data.docxFile, 'base64')],
          { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        );
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocr_result_${Date.now()}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
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
    <div className="container-test-ocr">
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="preview-image" />
        ) : (
          <p>Click or drag and drop an image here</p>
        )}
      </div>

      {readyToProcess && (
        <button
          onClick={handleUpload}
          disabled={isProcessing}
          className="process-button"
        >
          {isProcessing ? 'Processing...' : 'Process Image'}
        </button>
      )}

      {results.length > 0 && (
        <div className="results-container">
          <h2>OCR Results</h2>
          <div className="text-content">
            {(() => {
              // Group words by line number
              const lineGroups = results.reduce((acc, word) => {
                if (!acc[word.lineNumber]) {
                  acc[word.lineNumber] = [];
                }
                acc[word.lineNumber].push(word);
                return acc;
              }, {});

              // Sort lines by line number and words by position within each line
              return Object.entries(lineGroups)
                .sort(([lineA], [lineB]) => parseInt(lineA) - parseInt(lineB))
                .map(([lineNumber, words]) => {
                  const firstWord = words[0];
                  const lastWord = words[words.length - 1];
                  const lineStart = firstWord.x;
                  const lineEnd = lastWord.x + lastWord.width;
                  const pageCenter = firstWord.pageWidth / 2;
                  const lineCenter = lineStart + (lineEnd - lineStart) / 2;

                  // Determine text alignment
                  let textAlign = 'left';
                  if (Math.abs(lineCenter - pageCenter) < 50) {
                    textAlign = 'center';
                  } else if (lineStart > pageCenter) {
                    textAlign = 'right';
                  }

                  return (
                    <div 
                      key={`line-${lineNumber}`} 
                      className="text-line"
                      style={{ textAlign }}
                    >
                      {words
                        .sort((a, b) => a.wordPosition - b.wordPosition)
                        .map((word, index) => (
                          <span
                            key={`${word.text}-${lineNumber}-${index}`}
                            className="word-item"
                            style={{
                              fontSize: `${word.fontSize * 0.8}px`,
                              fontWeight: word.bold ? 'bold' : 'normal',
                              fontStyle: word.italic ? 'italic' : 'normal',
                              textDecoration: word.underlined ? 'underline' : 'none',
                              fontFamily: word.fontName !== "Unknown" ? word.fontName : 
                                        word.language === "khm" ? "Khmer OS Battambang" : "Arial"
                            }}
                          >
                            {word.text}
                            <div className="word-details">
                              <span className="font-info">
                                Font: {word.fontName} ({word.fontSize}px)
                              </span>
                              <span className="position-info">
                                Line: {word.lineNumber}, Position: {word.wordPosition}
                              </span>
                              <span className="position-coords">
                                Position: ({word.x}, {word.y}) Size: {word.width}x{word.height}
                              </span>
                              <span className="confidence">
                                Confidence: {Math.round(word.confidence)}%
                              </span>
                            </div>
                          </span>
                        ))}
                    </div>
                  );
                });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}