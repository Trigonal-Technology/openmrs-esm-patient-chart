import React, { useEffect, useRef, useState } from "react";
import { Button, Toggle, Section, Checkbox, ProgressBar, Modal } from "@carbon/react";
import styles from "./AnalysisPopup.scss";
import { Radar } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  RadialLinearScale,
} from "chart.js";

import { useGridApiRef } from "@mui/x-data-grid";
import { getImage, setRandomImage } from "../utils/imageUtils";
import { useTranslation } from 'react-i18next';
import { fetchPredictions } from '../api/api';

interface AnalysisPopupProps {
  isOpen: boolean;
  onClose: () => void;
  imageData?: string;
}

const AnalysisPopup: React.FC<AnalysisPopupProps> = ({ isOpen, onClose }) => {
  const apiRef = useGridApiRef();
  const { t } = useTranslation();

  Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    // Legend,
    RadialLinearScale
  );

  const [showUpArrow, setShowUpArrow] = useState(false);
  const [showDownArrow, setShowDownArrow] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [predictionData, setPredictionData] = useState(null);
  const [superimposedImages, setSuperimposedImages] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);
  const [activeToggle, setActiveToggle] = useState<string | null>(null);
  const [maxMean, setMaxMean] = useState<number>(0);

  useEffect(() => {
    const loadPredictions = async () => {
      try {
        setIsLoading(true);
        const data = await fetchPredictions(getImage());
        setPredictionData(data);
        setSuperimposedImages(data.superimposed_images);

        // Calculate max mean value
        const maxMeanValue = Math.max(...Object.values(data.prediction_mean));
        setMaxMean(maxMeanValue);

        // Set the activeToggle to the key of the first element after sorting
        const sortedKeys = Object.entries(data.prediction_mean)
          .sort(([, a], [, b]) => b - a)
          .map(([key]) => key);
        
        if (sortedKeys.length > 0) {
          setActiveToggle(sortedKeys[0]);
        }
      } catch (error) {
        console.error('Error fetching predictions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPredictions();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop;
        const scrollHeight = scrollContainerRef.current.scrollHeight;
        const clientHeight = scrollContainerRef.current.clientHeight;

        if (scrollTop + clientHeight >= scrollHeight) {
          setShowUpArrow(true);
          setShowDownArrow(false);
        } else {
          setShowUpArrow(false);
          setShowDownArrow(true);
        }
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const getSeverityColor = (mean: number) => {
    // Calculate percentage relative to max mean
    const percentage = (mean / maxMean) * 100;

    if (percentage < 33) {
      return 'green'; 
    }
    if (percentage < 66) {
      return 'orange';
    }
    return 'red';
  };

  return (
    <Modal
      open={isOpen}
      onRequestClose={onClose}
      // modalHeading={t('analysisResults', 'Analysis Results')}
      // modalLabel={t('aiDiagnostics', 'AI Diagnostics')}
      size="lg"
      passiveModal={false}
      primaryButtonText={t('close', 'Close')}
      onRequestSubmit={onClose}
      className={styles.largeModal}
    >
      <Section className={styles.modalContent}>
        {isLoading && (
          <>
            <p/>
            <div className={styles.screen1}>
              <img
                id="diagnostic-image"
                className={styles.scan}
                src={`data:image/png;base64,${getImage()}`}
                alt="Radiographie"
              />
            </div>
            <ProgressBar
              className={styles.progressBar}
              indeterminate
            />
            <p style={{ textAlign: 'center' }}>{t('loading', 'Loading')}</p>
            <p style={{ textAlign: 'center' }}>{t('loadingLong', 'Have patience! Analysis is in progress')}</p>
          </>
        )}
        {!isLoading && predictionData && (
          <section
            className={styles.analysisSection}
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              padding: "1rem",
              overflowY: "auto"
            }}
          >
            <div className={styles.container}>
              <div className={styles.screen1}>
                <img
                  className={styles.scan}
                  src={`data:image/png;base64,${getImage()}`}
                  alt="Radiographie"
                />
                <p><strong>Original image</strong></p>
              </div>
              <span className={styles.separater} />
              <div className={styles.screen2}>
                <div className={styles.section1}>
                  <img
                    className={styles.scan}
                    src={`data:image/png;base64,${superimposedImages[activeToggle]}`}
                    alt={`Radiographie heatmap of ${activeToggle}`}
                  />
                  <p>Radiographie heatmap of <strong>{activeToggle}</strong></p>
                </div>
                <div className={styles.section2}>
                  <div className={styles.legend} style={{ marginBottom: '1rem' }}>
                    <label htmlFor="legend" style={{ 
                      fontWeight: 'bold',
                      display: 'block',
                      marginBottom: '0.5rem'
                    }}>
                      {t('legend', 'Legend')}
                    </label>
                    <ul className={styles.list}>
                      <li className={styles['list-item']}>
                        <svg height="20" viewBox="0 0 32 32" width="20" xmlns="http://www.w3.org/2000/svg">
                          <g id="Ikon">
                            <rect fill="green" height="28" rx="3" width="28" x="2" y="2" />
                          </g>
                        </svg>
                        {t('mild', "Mild")}
                      </li>
                      <li className={styles['list-item']}>
                        <svg height="20" viewBox="0 0 32 32" width="20" xmlns="http://www.w3.org/2000/svg">
                          <g id="Ikon">
                            <rect fill="gold" height="28" rx="3" width="28" x="2" y="2" />
                          </g>
                        </svg>
                        {t('moderate', 'Moderate')}
                      </li>
                      <li className={styles['list-item']}>
                        <svg height="20" viewBox="0 0 32 32" width="20" xmlns="http://www.w3.org/2000/svg">
                          <g id="Ikon">
                            <rect fill="red" height="28" rx="3" width="28" x="2" y="2" />
                          </g>
                        </svg>
                        {t('severe', 'Severe')}
                      </li>
                    </ul>
                  </div>
                  <svg
                    id="Layer_1"
                    enableBackground="new 0 0 128 128"
                    height="30"
                    viewBox="0 0 128 128"
                    width="30"
                    className={`${styles.bounce2} ${showUpArrow ? "" : styles.hidden}`}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      id="Up_Arrow_9_"
                      d="m104 72c-1.023 0-2.047-.391-2.828-1.172l-37.172-37.172-37.172 37.172c-1.563 1.563-4.094 1.563-5.656 0s-1.563-4.094 0-5.656l40-40c1.563-1.563 4.094-1.563 5.656 0l40 40c1.563 1.563 1.563 4.094 0 5.656-.781.781-1.805 1.172-2.828 1.172z"
                    />
                  </svg>
                  <div ref={scrollContainerRef} className={styles.scroll}>
                    <table>
                      <thead>
                        <tr>
                          <th id="heatmap">{t('heatmap', 'HeatMap')}</th>
                          <th id="verified">{t('verified', 'Verified')}</th>
                          <th id="predictions">{t('severity', 'Severity')}</th>
                          <th id="percent">{t('accuracy', 'Accuracy')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {predictionData && Object.entries(predictionData.prediction_mean)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .slice(0, showAll ? undefined : 7)
                          .map(([key, mean], index) => (
                          <tr key={key}>
                            <td className={styles.toggle}>
                              <Toggle
                                id={key}
                                labelText={key}
                                hideLabel={true}
                                toggled={activeToggle === key}
                                onToggle={() => setActiveToggle(key)}
                              />
                            </td>
                            <td>
                              <Checkbox
                                id={`checkbox-${key}`}
                                hideLabel={true}
                                className={styles.checkbox}
                                labelText={""}
                              />
                            </td>
                            <td>
                              <svg
                                height="20"
                                viewBox="0 0 32 32"
                                width="20"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{ marginLeft: 10 }}
                              >
                                <g id="Ikon">
                                  <rect
                                    fill={getSeverityColor(predictionData.prediction_mean[key])}
                                    height="28"
                                    rx="3"
                                    width="28"
                                    x="2"
                                    y="2"
                                  />
                                </g>
                              </svg>
                            </td>
                            <td>
                              {`${Math.round(predictionData.prediction_mean[key] * 100)}%(${Math.round(predictionData.prediction_variance[key] as number * 100)}%)`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {predictionData && Object.keys(predictionData.prediction_mean).length > 7 && (
                        <tfoot>
                          <tr>
                            <td colSpan={4}>
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setShowAll(!showAll);
                                }}
                                style={{ color: 'blue', textDecoration: 'underline', fontSize: 'larger' }}
                              >
                                {showAll ? t('See less') : t('See more')}
                              </a>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                    <Radar
                      title="Graph ....."
                      data={{
                        labels: predictionData ? Object.keys(predictionData.prediction_mean) : [],
                        datasets: [{
                          data: predictionData ? Object.values(predictionData.prediction_mean) : [],
                          fill: true,
                          backgroundColor: "rgba(255, 99, 132, 0.2)",
                          borderColor: "rgb(255, 99, 132)",
                          pointBackgroundColor: "rgb(255, 99, 132)",
                          pointBorderColor: "#fff",
                          pointHoverBackgroundColor: "#fff",
                          pointHoverBorderColor: "rgb(255, 99, 132)",
                        }],
                      }}
                    />
                  </div>
                  <svg
                    id="Layer_1"
                    enableBackground="new 0 0 128 128"
                    height="30"
                    viewBox="0 0 128 128"
                    width="30"
                    className={`${styles.bounce2} ${showDownArrow ? "" : styles.hidden}`}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      id="Down_Arrow_9_"
                      d="m64 104c-1.023 0-2.047-.391-2.828-1.172l-40-40c-1.563-1.563-1.563-4.094 0-5.656s4.094-1.563 5.656 0l37.172 37.172 37.172-37.172c1.563-1.563 4.094-1.563 5.656 0s1.563 4.094 0 5.656l-40 40c-.781.781-1.805 1.172-2.828 1.172z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </section>
        )}
      </Section>
    </Modal>
  );
};

export default AnalysisPopup; 