// PipelineWizard.jsx - Single-step spreadsheet import & mapping validation for outbound call queues.
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { WorkflowEngine } from '../../services/WorkflowEngine';
import { SampleDataGenerator } from '../../utils/SampleDataGenerator';

export function PipelineWizard({ onQueueGenerated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  const processFile = (file) => {
    setLoading(true);
    setError(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json(ws);

        if (!rawRows || rawRows.length === 0) {
          throw new Error('The uploaded file is empty or invalid.');
        }

        // Detect columns from first row
        const firstRow = rawRows[0];
        const columnMapping = {
          patientId: WorkflowEngine.getFuzzyValue(firstRow, ['patientid', 'mrn', 'id', 'patientnumber']) ? 'Detected' : 'Missing (Auto-Generated)',
          patientName: (WorkflowEngine.getFuzzyValue(firstRow, ['patientname', 'name', 'fullname']) || 
                        (WorkflowEngine.getFuzzyValue(firstRow, ['firstname', 'first']) && WorkflowEngine.getFuzzyValue(firstRow, ['lastname', 'last']))) ? 'Detected' : 'Missing',
          phone: WorkflowEngine.getFuzzyValue(firstRow, ['cellphone', 'cell', 'mobilephone', 'mobile', 'phone', 'telephone', 'contact']) ? 'Detected' : 'Missing',
          practice: WorkflowEngine.getFuzzyValue(firstRow, ['practicename', 'facilityname', 'practice', 'facility', 'organization']) ? 'Detected' : 'Missing',
          pcp: WorkflowEngine.getFuzzyValue(firstRow, ['pcp', 'primarycareprovider', 'doctor', 'physician', 'provider']) ? 'Detected' : 'Fallback Applied',
          dob: WorkflowEngine.getFuzzyValue(firstRow, ['dob', 'dateofbirth', 'birthdate']) ? 'Detected' : 'Missing',
          sex: WorkflowEngine.getFuzzyValue(firstRow, ['sex', 'gender']) ? 'Detected' : 'Missing'
        };

        // Run filtering
        const { accepted, rejected } = WorkflowEngine.filterEnsRecords(rawRows, false);

        // Generate queue (no separate practice/AI accounts list required - all practices processed directly)
        const generatedQueue = WorkflowEngine.generateCallQueue(accepted);

        setParsedData({
          fileName: file.name,
          rawCount: rawRows.length,
          acceptedCount: accepted.length,
          rejectedCount: rejected.length,
          mapping: columnMapping,
          queue: generatedQueue
        });
      } catch (err) {
        setError(err.message || 'Error parsing spreadsheet.');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Failed to read file.');
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const handleProceed = () => {
    if (parsedData) {
      onQueueGenerated(parsedData.queue, parsedData.rawCount);
    }
  };

  const triggerDownloadSample = () => {
    const workbook = SampleDataGenerator.generateEnsReport();
    SampleDataGenerator.downloadWorkbook(workbook, 'Guardian_ENS_Report_Sample.xlsx');
  };

  return (
    <div className="card border glass-card shadow-lg mb-4">
      <div className="card-header card-header-velzon py-3">
        <h5 className="mb-0 text-white fw-bold text-center">Import Transition of Care (ENS) Report</h5>
      </div>
      <div className="card-body p-4">
        {!parsedData ? (
          <div className="text-center py-4">
            <p className="text-secondary small mb-4">
              Upload your hospital ENS export to automatically generate a calling campaign, filter outpatients, and resolve practices.
            </p>
            
            <div className="d-flex flex-column align-items-center border border-dashed rounded p-5 mb-4 bg-light bg-opacity-25 border-primary">
              <i className="bi bi-file-earmark-spreadsheet text-primary" style={{ fontSize: '4rem' }}></i>
              <label className="btn btn-primary mt-4 px-4 py-2 cursor-pointer shadow-sm">
                {loading ? 'Reading Excel...' : 'Choose Excel/CSV Report'}
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={loading} hidden />
              </label>
              <small className="text-muted mt-2">Supports .xlsx, .xls, and .csv formats</small>
            </div>

            {error && (
              <div className="alert alert-danger py-2 px-3 small mb-3 text-start">
                <i className="bi bi-exclamation-octagon-fill me-2"></i> {error}
              </div>
            )}

            <div className="bg-light p-3 rounded text-center border">
              <span className="small text-secondary fw-semibold d-block mb-2">Need a test file?</span>
              <button className="btn btn-sm btn-outline-secondary" onClick={triggerDownloadSample}>
                <i className="bi bi-download me-1"></i> Download Sample ENS Spreadsheet
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="alert alert-success d-flex align-items-center mb-4 py-3">
              <i className="bi bi-check-circle-fill fs-3 me-3 text-success"></i>
              <div>
                <h6 className="alert-heading fw-bold mb-1">Spreadsheet Successfully Processed!</h6>
                <p className="mb-0 small text-secondary">
                  File <strong>{parsedData.fileName}</strong> read successfully.
                </p>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="row g-3 text-center mb-4">
              <div className="col-4">
                <div className="border rounded p-3 bg-light">
                  <small className="text-secondary uppercase font-monospace text-xs d-block mb-1">Total Imported</small>
                  <h3 className="mb-0 fw-bold text-dark">{parsedData.rawCount}</h3>
                </div>
              </div>
              <div className="col-4">
                <div className="border rounded p-3 bg-success bg-opacity-10 border-success border-opacity-25">
                  <small className="text-success uppercase font-monospace text-xs d-block mb-1">Eligible Patients</small>
                  <h3 className="mb-0 fw-bold text-success">{parsedData.acceptedCount}</h3>
                </div>
              </div>
              <div className="col-4">
                <div className="border rounded p-3 bg-warning bg-opacity-10 border-warning border-opacity-25">
                  <small className="text-warning uppercase font-monospace text-xs d-block mb-1">Excluded (OP/Non-Disch)</small>
                  <h3 className="mb-0 fw-bold text-warning">{parsedData.rejectedCount}</h3>
                </div>
              </div>
            </div>

            {/* Column Mapping Section */}
            <div className="card border mb-4 bg-light bg-opacity-50">
              <div className="card-header bg-transparent border-bottom py-2">
                <h6 className="mb-0 fw-bold small text-secondary uppercase font-monospace">
                  <i className="bi bi-gear-fill me-1"></i> Mapped Fields Validation
                </h6>
              </div>
              <div className="card-body p-0">
                <table className="table table-sm table-borderless mb-0 small text-xs">
                  <tbody>
                    {Object.entries(parsedData.mapping).map(([field, status]) => (
                      <tr key={field} className="border-bottom border-light px-3">
                        <td className="ps-3 py-2 text-capitalize fw-semibold text-secondary">{field.replace(/([A-Z])/g, ' $1')}</td>
                        <td className="text-end pe-3 py-2">
                          <span className={`badge ${status === 'Detected' ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="d-flex justify-content-between gap-2">
              <button className="btn btn-outline-secondary" onClick={() => setParsedData(null)}>
                Upload Different File
              </button>
              <button className="btn btn-success px-4" onClick={handleProceed}>
                Proceed to Campaign Dashboard <i className="bi bi-arrow-right-short ms-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PipelineWizard;
