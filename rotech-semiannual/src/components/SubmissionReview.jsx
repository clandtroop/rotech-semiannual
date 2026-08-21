import { useState } from 'react';
import { buildSubmissionView } from '../utils/submissionView';
import { downloadSubmissionPdf } from '../utils/submissionPdf';

const TONE_BADGES = {
  positive: 'bg-green-100 text-green-800',
  negative: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  neutral: 'bg-gray-100 text-gray-700',
};

// Read-only view of a submitted assessment, with a "Download PDF" action.
// Renders the same block outline the PDF is generated from.
export default function SubmissionReview({ assessment, locationName, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const view = buildSubmissionView(assessment, locationName);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      await downloadSubmissionPdf(assessment, locationName);
    } catch (err) {
      setError(`Could not generate PDF: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-4 p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{view.formName} — {view.formTitle}</h3>
            <p className="text-sm text-gray-600 mt-1">{view.locationName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition disabled:opacity-50 whitespace-nowrap"
            >
              {downloading ? 'Generating…' : '⬇ Download PDF'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-100 text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
            {view.meta.map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-600">{label}</p>
                <p className="text-sm font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {view.blocks.map((block, i) => {
            if (block.type === 'heading') {
              return (
                <h4 key={i} className="text-lg font-bold text-blue-900 border-b-2 border-blue-900 pb-1 pt-2">
                  {block.text}
                </h4>
              );
            }
            if (block.type === 'subheading') {
              return <h5 key={i} className="text-md font-semibold text-gray-800 pt-1">{block.text}</h5>;
            }
            if (block.type === 'fields') {
              return (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2">
                  {block.rows.map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-600">{label}</p>
                      <p className="text-sm font-semibold text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>
              );
            }
            if (block.type === 'note') {
              return <p key={i} className="text-sm text-gray-600 italic whitespace-pre-line">{block.text}</p>;
            }
            if (block.type === 'table') {
              return (
                <div key={i} className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        {block.columns.map((col) => (
                          <th key={col} className="px-3 py-2 text-left font-semibold text-gray-700">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, r) => (
                        <tr key={r} className="border-b border-gray-100 last:border-b-0">
                          {row.cells.map((cell, c) => (
                            <td key={c} className="px-3 py-2 text-gray-800">
                              {c === row.cells.length - 1 ? (
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${TONE_BADGES[row.tone] || TONE_BADGES.neutral}`}>
                                  {cell}
                                </span>
                              ) : cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}
