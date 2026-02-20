import { InterviewResult } from '../types';

/**
 * Export interview session data as a JSON file
 */
export const exportAsJSON = (session: InterviewResult): void => {
  const dataStr = JSON.stringify(session, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `interview-${session.config.jobTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date(session.date).toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Format duration from seconds to readable string
 */
const formatDuration = (seconds?: number): string => {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

/**
 * Export interview session as a downloadable PDF file
 */
export const exportAsPDF = (session: InterviewResult): void => {
  const questionsHtml =
    session.questions && session.questions.length > 0
      ? `
      <div class="section">
        <h2>Questions & Responses</h2>
        ${session.questions
          .map(
            (qr, idx) => `
          <div class="question-block">
            <div class="question-header">
              <span class="question-number">Q${idx + 1}</span>
              <span class="question-text">${qr.question.question}</span>
            </div>
            <div class="response-time">Duration: ${Math.round((qr.endTime - qr.startTime) / 1000)}s</div>
            ${qr.transcription ? `<div class="response-text"><strong>Response:</strong><br/>${qr.transcription.replace(/\n/g, '<br/>')}</div>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    `
      : session.transcription
        ? `
        <div class="section">
          <h2>Session Transcript</h2>
          <div class="transcript">${session.transcription.replace(/\n/g, '<br/>')}</div>
        </div>
      `
        : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Interview Report - ${session.config.jobTitle}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          color: #1e293b;
          line-height: 1.6;
        }
        .header {
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 28px;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .header .meta {
          color: #64748b;
          font-size: 14px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          font-size: 18px;
          color: #334155;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
        }
        .metric {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        .metric-value {
          font-size: 24px;
          font-weight: 800;
          color: #2563eb;
        }
        .metric-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
          margin-top: 5px;
        }
        .info-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }
        .info-item {
          background: #f1f5f9;
          padding: 12px 20px;
          border-radius: 8px;
        }
        .info-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
        }
        .info-value {
          font-weight: 700;
          color: #1e293b;
        }
        .suggestions-list {
          list-style: none;
        }
        .suggestions-list li {
          padding: 12px 15px;
          background: #f0fdf4;
          margin-bottom: 10px;
          border-radius: 8px;
          border-left: 4px solid #22c55e;
          font-size: 14px;
        }
        .question-block {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 15px;
          border: 1px solid #e2e8f0;
        }
        .question-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }
        .question-number {
          background: #2563eb;
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
        }
        .question-text {
          font-weight: 600;
          color: #1e293b;
        }
        .response-time {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 10px;
        }
        .response-text {
          background: white;
          padding: 15px;
          border-radius: 6px;
          font-size: 13px;
          border: 1px solid #e2e8f0;
        }
        .transcript {
          background: #1e293b;
          color: #cbd5e1;
          padding: 20px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 13px;
          white-space: pre-wrap;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
        }
        @media print {
          body { padding: 20px; }
          .metrics-grid { grid-template-columns: repeat(5, 1fr); }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Interview Performance Report</h1>
        <div class="meta">
          <strong>${session.config.jobTitle}</strong> • ${session.config.mode} • ${session.config.level}
          <br/>
          Date: ${new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div class="section">
        <h2>Performance Metrics</h2>
        <div class="metrics-grid">
          <div class="metric">
            <div class="metric-value">${session.metrics.communication}%</div>
            <div class="metric-label">Communication</div>
          </div>
          <div class="metric">
            <div class="metric-value">${session.metrics.confidence}%</div>
            <div class="metric-label">Confidence</div>
          </div>
          <div class="metric">
            <div class="metric-value">${session.metrics.technicalAccuracy}%</div>
            <div class="metric-label">Technical</div>
          </div>
          <div class="metric">
            <div class="metric-value">${session.metrics.bodyLanguage}%</div>
            <div class="metric-label">Body Language</div>
          </div>
          <div class="metric">
            <div class="metric-value">${session.metrics.overall}%</div>
            <div class="metric-label">Overall</div>
          </div>
        </div>
      </div>

      <div class="info-row">
        <div class="info-item">
          <div class="info-label">Session Duration</div>
          <div class="info-value">${formatDuration(session.duration)}</div>
        </div>
        ${
          session.questions && session.questions.length > 0
            ? `
        <div class="info-item">
          <div class="info-label">Questions</div>
          <div class="info-value">${session.questions.length} question${session.questions.length > 1 ? 's' : ''}</div>
        </div>
        `
            : ''
        }
      </div>

      <div class="section">
        <h2>AI Suggestions for Improvement</h2>
        <ul class="suggestions-list">
          ${session.suggestions.map((s) => `<li>${s}</li>`).join('')}
        </ul>
      </div>

      ${questionsHtml}

      <div class="footer">
        Generated by MockMentor AI Interview Coach • ${new Date().toLocaleDateString()}
      </div>
    </body>
    </html>
  `;

  // Render HTML in a hidden iframe, capture with html2canvas, and download as PDF
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '800px';
  iframe.style.height = '1200px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for content to render, then capture
  setTimeout(async () => {
    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import(/* @vite-ignore */ 'https://esm.sh/html2canvas@1.4.1'),
        import(/* @vite-ignore */ 'https://esm.sh/jspdf@2.5.2')
      ]);
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;

      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        width: 800,
        windowWidth: 800
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Additional pages if content overflows
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `interview-${session.config.jobTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date(session.date).toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation failed:', err);
      // Fallback: download as HTML file
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interview-${session.config.jobTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date(session.date).toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      document.body.removeChild(iframe);
    }
  }, 500);
};
