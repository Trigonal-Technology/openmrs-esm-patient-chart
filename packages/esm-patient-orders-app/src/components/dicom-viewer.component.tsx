import React, { useEffect } from 'react';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';

export const DicomViewer = ({ studyUrl }: { studyUrl: string }) => {
  useEffect(() => {
    cornerstone.enable(document.getElementById('dicomImage'));
    
    // Configure WADO Image loader
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.configure({
      beforeSend: (xhr: XMLHttpRequest) => {
        // Add any necessary headers
        xhr.setRequestHeader('Accept', 'application/dicom');
      }
    });

    // Load and display the image
    const loadAndViewImage = async () => {
      try {
        const image = await cornerstone.loadImage(`wadouri:${studyUrl}`);
        cornerstone.displayImage(
          document.getElementById('dicomImage'), 
          image
        );
      } catch (error) {
        console.error('Error loading DICOM image:', error);
      }
    };

    loadAndViewImage();

    // Cleanup
    return () => {
      cornerstone.disable(document.getElementById('dicomImage'));
    };
  }, [studyUrl]);

  return (
    <div 
      id="dicomImage" 
      style={{ width: '512px', height: '512px' }}
    />
  );
};
