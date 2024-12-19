import React from 'react';

const SummarySection = ({ title, content, className = '' }) => {
  if (!content) return null;
  
  return (
    <div className={`summary-section ${className}`}>
      <h4>{title}</h4>
      <pre className="summary-content">{content}</pre>
    </div>
  );
};

export default SummarySection; 