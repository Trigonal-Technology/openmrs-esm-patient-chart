import React from 'react';

interface DynamicContentProps {
  title: string;
  imageSrc: string;
  description: string;
}

const DynamicContent: React.FC<DynamicContentProps> = ({ title, imageSrc, description }) => {
  return (
    <div className="dynamic-content">
      <h2>{title}</h2>
      <img className="scan" src={"../img.jpg"} alt={title} />
      <p>{description}</p>
    </div>
  );
};

export default DynamicContent; 