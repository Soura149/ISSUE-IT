export const generateImpactCard = (issue) => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // High-resolution canvas
      canvas.width = 1200;
      canvas.height = 630; // standard open-graph ratio

      // Background (#0F1117)
      ctx.fillStyle = '#0F1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Red Signal Anchor Accent Line (#EF4444)
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(0, 0, 20, canvas.height);

      // Typography Setup
      ctx.fillStyle = '#F9FAFB';
      ctx.textAlign = 'left';

      // Header: Civic Hazard Detected
      ctx.font = 'bold 48px Inter, sans-serif';
      ctx.fillText('CIVIC HAZARD DETECTED', 60, 100);

      // Category Hazard
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 72px Inter, sans-serif';
      ctx.fillText((issue.category || 'Issue').toUpperCase(), 60, 190);

      // Status Badge
      ctx.fillStyle = '#1F2937';
      ctx.fillRect(60, 230, 260, 50);
      ctx.fillStyle = '#F9FAFB';
      ctx.font = '600 24px Inter, sans-serif';
      ctx.fillText(`STATUS: ${issue.status.toUpperCase()}`, 80, 265);

      // Location Coordinates
      ctx.fillStyle = '#6B7280';
      ctx.font = '400 32px Inter, sans-serif';
      ctx.fillText(`Coordinates: ${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`, 60, 360);

      // Community Verification
      ctx.fillStyle = '#D1D5DB';
      ctx.font = '500 36px Inter, sans-serif';
      ctx.fillText(`Verified by ${issue.upvote_count} local residents`, 60, 420);

      // Dynamic line wrapping for description
      ctx.fillStyle = '#F9FAFB';
      ctx.font = '400 28px Inter, sans-serif';
      
      const words = (issue.description || issue.ai_description || '').split(' ');
      let line = '';
      let y = 490;
      const maxWidth = 1000;

      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, 60, y);
          line = words[n] + ' ';
          y += 40;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 60, y);

      // Footer CTA
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText('Powered by CivicPulse', 60, canvas.height - 40);

      // Convert to image data URL
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
};
