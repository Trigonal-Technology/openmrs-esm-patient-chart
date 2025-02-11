import React, { useState } from 'react';
import styles from './radiology-order.scss';
import {
  IconButton,
} from '@carbon/react';
import { ViewIcon } from '@openmrs/esm-framework';
import { formatDate } from '@openmrs/esm-framework';
import { RadiologyOrder } from '../types/radiologyOrders';
import DynamicContent from './DynamicContent';
import AnalysisPopup from './AnalysisPopup';
import ReactDOM from 'react-dom';
import { setRandomImage } from '../utils/imageUtils';
import { Button } from '@carbon/react';
import { t } from 'i18next';
import { DataAnalytics } from '@carbon/icons-react';
import { DicomViewer } from './dicom-viewer.component';
// import { toast } from '@/components/ui/use-toast';

// import AnalysisPopup from './AnalysisPopup';

interface StudyResponse {
  "00081190"?: {
    vr: string;
    Value?: string[];
  };
}

interface RadiologyOrderProps {
  radiologyOrder: RadiologyOrder;
  patientId: string;
}

const RadiologyOrderComponent: React.FC<RadiologyOrderProps> = ({ radiologyOrder, patientId }) => {
  const [isPopupVisible, setPopupVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // const togglePopup = () => {
  //   setRandomImage();
  //   setPopupVisible(!isPopupVisible);
  //   setIsModalOpen(true);
  // };

  // const handleViewClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // window.open(`weasis://$dicom:rs --url "http://34.66.106.64:8080/dcm4chee-arc/aets/DCM4CHEE/rs" -r "patientID=${patientId}" --query-ext "&includedefaults=false`)
    // const handleViewClick = async (event: React.MouseEvent<HTMLButtonElement>, patientId: string) => {

    //   try {
    //     const response = await fetch(`https://dcm4chee.sankof.ai/dcm4chee-arc/aets/DCM4CHEE/rs/studies?PatientID=${patientId}`);

    //     if (!response.ok) {
    //       throw new Error("Failed to fetch data");
    //     }

    //     const data = await response.json();
    //     console.log(data);

    //     const study = data[0];
    //     console.error(study);
    //     const studyUrl = study["00181190"]?.Value?.[0];

    //     if (studyUrl) {
    //       window.open(studyUrl);
    //     } else {
    //       console.error("Study URL not found");
    //     }
    //   } catch (error) {
    //     console.error("Error fetching or processing data:", error);
    //   }
    // };
  const handleViewClick = async (
  event: React.MouseEvent<HTMLButtonElement>,
  patientId: string
): Promise<void> => {
  event.preventDefault();

  try {
    // Input validation
    if (!patientId?.trim()) {
      throw new Error("Patient ID is required");
    }

    // Fetch study data
    const response = await fetch(
      `https://dcm4chee.sankof.ai/dcm4chee-arc/aets/DCM4CHEE/rs/studies?PatientID=${encodeURIComponent(patientId)}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const studies: StudyResponse[] = await response.json();

    if (!studies || studies.length === 0) {
      throw new Error("No studies found for this patient");
    }

    const studyUrl = studies[0]["00081190"]?.Value?.[0];

    if (!studyUrl) {
      throw new Error("Study URL not found in response");
    }
    // window.open(`weasis://$dicom:rs --url ${studyUrl} -r "patientID=${patientId}" --query-ext "&includedefaults=false`)
    // window.open(studyUrl, '_blank', 'noopener,noreferrer');
    <DicomViewer studyUrl={studyUrl}/>
    console.log(`study url: ${studyUrl}`);

  } catch (error) {
    console.error("Error in handleViewClick:", error); 
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
  }
};

  return (
    <div className={styles.radiologyController}>
      <div className={styles.startDateColumn}>
        <span>{formatDate(new Date(radiologyOrder.dateActivated))}</span>
      </div>
      <IconButton
        label="View Image"
        align="left"
        kind="ghost"
        onClick={(event) => {handleViewClick(event, patientId="10001NG")}
        }
      >
        <ViewIcon />
      </IconButton>
      <Button
        kind="ghost"
        title="AI Analysis"
        renderIcon={(props) => <DataAnalytics {...props} size={16} />}
        iconDescription={t('aiAnalysisDesc', 'Analyze Image using AI model')}
        align="left"
        onClick={() => { setRandomImage();setPopupVisible(true);setIsModalOpen(true);}}
      >
      </Button>
      {isPopupVisible && (
        ReactDOM.createPortal(
        <div className="popup" style={{ position: 'fixed', top: '50%', left: '50%', width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', transform: 'translate(-50%, -50%)', zIndex: 9999 }}>
          {/* <div className="popup-content" style={{ background: 'white', padding: '20px', borderRadius: '5px', width: '90%', height: '90%' , overflow: 'auto'}}> */}
            {/* <button onClick={togglePopup} className="close-button" style={{position: 'absolute', top: '6%', right: '6%', zIndex: '100'}}>Close</button> */}
            {/* <DynamicContent
              title="Radiography Analysis"
              imageSrc="../public/view1_frontal (10).jpg" // Replace with dynamic image source if needed
              description="This is a detailed analysis of the radiography." // Replace with dynamic description if needed
            // /> */}
             <AnalysisPopup
              isOpen={isModalOpen}
              onClose={() => {setIsModalOpen(false);  setPopupVisible(false);}}
            />
          {/* </div> */}
        </div>,
        document.body
      ))}
    </div>
  );
};
export default RadiologyOrderComponent;