import React from 'react';
import { createRoot } from 'react-dom/client';
import { SylvaHero } from '@designcodeio/threeui';
import '@designcodeio/threeui/style.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="shader-frame">
      <SylvaHero
        variant="living-green"
        headingFont="lexend"
        bodyFont="lexend"
        headingWeight="300"
        bodyWeight="300"
        primaryColor="#ffffff"
        headingSize={63}
        bodySize={16.5}
        headingLetterSpacing={-0.006}
      />
    </div>
  </React.StrictMode>
);
