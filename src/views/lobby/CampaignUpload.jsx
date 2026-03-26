import { useState, useRef } from 'react';
import { loadBlueprintFromFile, loadDefaultBlueprint } from '@engine/BlueprintLoader.js';
import styles from './lobby.module.css';

export function CampaignUpload({ onBlueprintLoaded }) {
  const [errors, setErrors] = useState([]);
  const [loaded, setLoaded] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.json')) {
      setErrors(['Please upload a .json campaign file.']);
      return;
    }
    const { data: blueprint, errors: errs } = await loadBlueprintFromFile(file);
    if (errs.length > 0) {
      setErrors(errs);
      setLoaded(null);
    } else {
      setErrors([]);
      setLoaded(blueprint.meta.title);
      onBlueprintLoaded(blueprint);
    }
  }

  async function loadDefault() {
    const { data: blueprint, errors: errs } = await loadDefaultBlueprint();
    if (errs.length > 0) {
      setErrors(errs);
    } else {
      setErrors([]);
      setLoaded(blueprint.meta.title);
      onBlueprintLoaded(blueprint);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <div
        className={`${styles.uploadArea} ${dragOver ? styles.uploadAreaDragOver : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload campaign file"
      >
        <div className={styles.uploadIcon}>📜</div>
        <div className={styles.uploadTitle}>Upload Campaign Blueprint</div>
        <div className={styles.uploadSubtext}>
          Drag &amp; drop a <code>.json</code> campaign file, or click to browse
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      <button className={styles.defaultBlueprintBtn} onClick={loadDefault} type="button">
        Or load default campaign (Monster Hunt: Tzorath)
      </button>

      {errors.length > 0 && (
        <div className={styles.uploadErrors}>
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {loaded && (
        <div className={styles.uploadSuccess}>
          <span>✓</span>
          <span>Loaded: <strong>{loaded}</strong></span>
        </div>
      )}
    </div>
  );
}
