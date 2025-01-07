'use client';

import { useState, useRef } from 'react';
import axios from 'axios';

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
      const response = await axios.post('/api/ocr', formData, {
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
    <div className="container">
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

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .drop-zone {
          border: 2px dashed #ccc;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          margin-bottom: 20px;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-image {
          max-width: 100%;
          max-height: 300px;
        }

        .process-button {
          background-color: #0070f3;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          width: 100%;
          margin-bottom: 20px;
        }

        .process-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .results-container {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid #eaeaea;
          border-radius: 5px;
          background: #f9f9f9;
        }

        .text-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .text-line {
          margin: 0.5em 0;
          line-height: 1.6;
          text-align: justify;
        }

        .word-item {
          display: inline-block;
          position: relative;
          margin-right: 4px;
        }

        .word-details {
          display: none;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 1000;
          min-width: 200px;
        }

        .word-item:hover .word-details {
          display: block;
        }

        .font-info, .position-info, .confidence {
          display: block;
          margin: 2px 0;
          text-align: left;
        }

        h2 {
          margin-bottom: 20px;
          color: #333;
        }

        .position-coords {
          display: block;
          margin: 2px 0;
          text-align: left;
          font-size: 11px;
          color: #ddd;
        }
      `}</style>
    </div>
  );
}