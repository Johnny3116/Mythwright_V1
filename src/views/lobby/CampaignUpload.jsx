import { useCallback, useRef, useState } from 'react';
import styles from './lobby.module.css';

// Required top-level keys that a valid Campaign Blueprint must have.
const REQUIRED_KEYS = ['meta', 'classes', 'enemies', 'zones'];

/**
 * Validate a parsed blueprint object has the minimum required structure.
 * @param {unknown} data
 * @returns {{ valid: boolean, message: string }}
 */
function validateBlueprint(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { valid: false, message: 'File does not contain a valid JSON object.' };
  }
  const missing = REQUIRED_KEYS.filter((k) => !(k in data));
  if (missing.length > 0) {
    return {
      valid: false,
      message: `Blueprint is missing required sections: ${missing.join(', ')}.`,
    };
  }
  if (!Array.isArray(data.classes) || data.classes.length === 0) {
    return { valid: false, message: 'Blueprint must define at least one class.' };
  }
  if (!Array.isArray(data.zones) || data.zones.length === 0) {
    return { valid: false, message: 'Blueprint must define at least one zone.' };
  }
  return { valid: true, message: '' };
}

/**
 * CampaignUpload
 *
 * Drag-and-drop / click-to-select JSON uploader for Campaign Blueprint files.
 *
 * @param {{ onBlueprintLoaded: (blueprint: object) => void }} props
 */
export function CampaignUpload({ onBlueprintLoaded }) {
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | dragging | loading | success | error
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  // -------------------------------------------------------------------------
  // File processing
  // -------------------------------------------------------------------------

  const processFile = useCallback(
    (file) => {
      if (!file) return;

      if (!file.name.endsWith('.json')) {
        setUploadStatus('error');
        setErrorMessage('Only .json files are accepted. Please select a Campaign Blueprint JSON file.');
        return;
      }

      setUploadStatus('loading');
      setFileName(file.name);

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const { valid, message } = validateBlueprint(parsed);
          if (!valid) {
            setUploadStatus('error');
            setErrorMessage(message);
            return;
          }
          setUploadStatus('success');
          onBlueprintLoaded(parsed);
        } catch {
          setUploadStatus('error');
          setErrorMessage('Failed to parse JSON. Make sure the file is valid JSON.');
        }
      };

      reader.onerror = () => {
        setUploadStatus('error');
        setErrorMessage('Could not read the file. Please try again.');
      };

      reader.readAsText(file);
    },
    [onBlueprintLoaded]
  );

  // -------------------------------------------------------------------------
  // Drag and drop handlers
  // -------------------------------------------------------------------------

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadStatus('dragging');
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadStatus('idle');
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setUploadStatus('idle');
      const file = e.dataTransfer?.files?.[0] ?? null;
      processFile(file);
    },
    [processFile]
  );

  // -------------------------------------------------------------------------
  // Click-to-browse
  // -------------------------------------------------------------------------

  const handleZoneClick = useCallback(() => {
    if (uploadStatus === 'loading') return;
    fileInputRef.current?.click();
  }, [uploadStatus]);

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0] ?? null;
      // Reset input so the same file can be re-selected after a reset
      e.target.value = '';
      processFile(file);
    },
    [processFile]
  );

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  const handleReset = useCallback(
    (e) => {
      e.stopPropagation();
      setUploadStatus('idle');
      setFileName('');
      setErrorMessage('');
    },
    []
  );

  // -------------------------------------------------------------------------
  // Zone class composition
  // -------------------------------------------------------------------------

  const zoneClass = [
    styles.uploadZone,
    uploadStatus === 'dragging' ? styles.uploadZoneDragging : '',
    uploadStatus === 'success' ? styles.uploadZoneSuccess : '',
    uploadStatus === 'error' ? styles.uploadZoneError : '',
  ]
    .filter(Boolean)
    .join(' ');

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  const renderContent = () => {
    switch (uploadStatus) {
      case 'loading':
        return (
          <div className={styles.uploadZoneDrop}>
            <div className={styles.uploadSpinner} />
            <span className={styles.uploadHint}>Reading blueprint…</span>
          </div>
        );

      case 'success':
        return (
          <div className={styles.uploadZoneDrop}>
            <div className={styles.uploadSuccessContent}>
              <span className={styles.uploadSuccessIcon}>✓</span>
              <span className={styles.uploadSuccessTitle}>Blueprint Loaded</span>
              <span className={styles.uploadFileName}>{fileName}</span>
              <button
                className={styles.uploadChangeBtn}
                onClick={handleReset}
                type="button"
                aria-label="Remove blueprint and upload a different file"
              >
                Change File
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className={styles.uploadZoneDrop}>
            <div className={styles.uploadErrorContent}>
              <span className={styles.uploadErrorIcon}>✕</span>
              <span className={styles.uploadErrorTitle}>Upload Failed</span>
              <span className={styles.uploadErrorMessage}>{errorMessage}</span>
              <button
                className={styles.uploadRetryBtn}
                onClick={handleReset}
                type="button"
                aria-label="Dismiss error and try uploading again"
              >
                Try Again
              </button>
            </div>
          </div>
        );

      case 'dragging':
        return (
          <div className={styles.uploadZoneDrop}>
            <span className={styles.uploadIcon}>📂</span>
            <span className={styles.uploadTitle}>Release to Upload</span>
            <span className={styles.uploadHint}>Drop your Campaign Blueprint JSON</span>
          </div>
        );

      default:
        return (
          <div className={styles.uploadZoneDrop}>
            <span className={styles.uploadIcon}>📜</span>
            <span className={styles.uploadTitle}>Upload Campaign Blueprint</span>
            <span className={styles.uploadHint}>
              Drag &amp; drop a .json file here, or click to browse
            </span>
          </div>
        );
    }
  };

  const isInteractive = uploadStatus !== 'success' && uploadStatus !== 'loading';

  return (
    <div
      className={zoneClass}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={isInteractive ? handleZoneClick : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? 'Upload campaign blueprint JSON file' : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleZoneClick();
              }
            }
          : undefined
      }
    >
      {renderContent()}
      {/* Hidden file input — kept in DOM at all times for programmatic .click() */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className={styles.fileInput}
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
        style={{ display: 'none' }}
      />
    </div>
  );
}
