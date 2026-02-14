/**
 * Asset Validator UI Component
 * Three-panel interface for comprehensive asset validation
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Badge,
  Paper,
  Grid,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Upload as UploadIcon,
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Build as BuildIcon,
  CloudDownload as DownloadIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

// Types
type ValidationSeverity = 'error' | 'warning' | 'info';
type ValidationDepth = 'quick' | 'standard' | 'deep';
type AssetType = 'all' | 'nif' | 'dds' | 'esp' | 'script' | 'sound';

interface ValidationIssue {
  id: string;
  file: string;
  type: string;
  severity: ValidationSeverity;
  message: string;
  details?: string;
  autoFixable: boolean;
  line?: number;
  suggestion?: string;
}

interface ValidationReport {
  modPath: string;
  totalFiles: number;
  filesScanned: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  scanTime: number;
  timestamp: number;
  compliance: {
    score: number;
    passedChecks: string[];
    failedChecks: string[];
  };
}

const AssetValidator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [scanning, setScanning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [validationDepth, setValidationDepth] = useState<ValidationDepth>('standard');
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetType>('all');
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file/folder selection
  const handleSelectPath = useCallback(async (isFolder: boolean) => {
    try {
      if (isFolder) {
        const path = await window.electron.api.pickDirectory('Select Mod Folder');
        if (path) setSelectedPath(path);
      } else {
        // Single file selection via input
        fileInputRef.current?.click();
      }
    } catch (error: any) {
      console.error('Path selection error:', error);
    }
  }, []);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPath(file.path);
    }
  }, []);

  // Start validation scan
  const handleStartScan = useCallback(async () => {
    if (!selectedPath) return;

    setScanning(true);
    setProgress(0);
    setCurrentFile('');
    setReport(null);

    try {
      // Call validation API
      const result = await window.electron.invoke('asset-validator:validate-mod', selectedPath, validationDepth, (prog: number, file: string) => {
        setProgress(prog);
        setCurrentFile(file);
      });

      setReport(result);
    } catch (error: any) {
      console.error('Validation error:', error);
    } finally {
      setScanning(false);
      setProgress(100);
    }
  }, [selectedPath, validationDepth]);

  // Validate single file
  const handleValidateFile = useCallback(async (filePath: string) => {
    setScanning(true);

    try {
      const ext = filePath.split('.').pop()?.toLowerCase();
      let type = ext || 'unknown';
      
      // Map extensions to types
      if (ext === 'esm') type = 'esp';
      if (ext === 'xwm') type = 'sound';
      
      const result = await window.electron.invoke('asset-validator:validate-file', filePath, type);

      // Convert single file result to report format
      const singleReport: ValidationReport = {
        modPath: filePath,
        totalFiles: 1,
        filesScanned: 1,
        issues: result.issues || [],
        summary: {
          errors: (result.issues || []).filter((i: ValidationIssue) => i.severity === 'error').length,
          warnings: (result.issues || []).filter((i: ValidationIssue) => i.severity === 'warning').length,
          info: (result.issues || []).filter((i: ValidationIssue) => i.severity === 'info').length
        },
        scanTime: 0,
        timestamp: Date.now(),
        compliance: {
          score: result.valid ? 100 : 50,
          passedChecks: result.valid ? ['File is valid'] : [],
          failedChecks: result.valid ? [] : ['Validation errors found']
        }
      };

      setReport(singleReport);
    } catch (error: any) {
      console.error('File validation error:', error);
    } finally {
      setScanning(false);
    }
  }, []);

  // Auto-fix selected issues
  const handleAutoFix = useCallback(async () => {
    if (!report) return;

    const issuesToFix = report.issues.filter(issue => selectedIssues.has(issue.id) && issue.autoFixable);

    if (issuesToFix.length === 0) {
      alert('No fixable issues selected');
      return;
    }

    try {
      const result = await window.electron.invoke('asset-validator:auto-fix', issuesToFix);

      if (result.success) {
        alert(`Fixed ${result.issuesFixed} issues. Backup saved to: ${result.backupPath}`);
        // Re-scan to update results
        handleStartScan();
      } else {
        alert('Auto-fix failed. Check the log for details.');
      }
    } catch (error: any) {
      console.error('Auto-fix error:', error);
    }
  }, [report, selectedIssues, handleStartScan]);

  // Export report
  const handleExportReport = useCallback(async (format: 'json' | 'html') => {
    if (!report) return;

    try {
      const result = await window.electron.invoke('asset-validator:export-report', report, format);
      
      if (result.success) {
        alert(`Report exported to: ${result.path}\nSize: ${(result.size / 1024).toFixed(2)} KB`);
      } else {
        alert(`Export failed: ${result.error || result.message}`);
      }
    } catch (error: any) {
      console.error('Export error:', error);
    }
  }, [report]);

  // Filter issues
  const filteredIssues = report?.issues.filter(issue => {
    if (assetTypeFilter !== 'all') {
      const ext = issue.file.split('.').pop()?.toLowerCase();
      if (assetTypeFilter === 'nif' && ext !== 'nif') return false;
      if (assetTypeFilter === 'dds' && ext !== 'dds') return false;
      if (assetTypeFilter === 'esp' && ext !== 'esp' && ext !== 'esm') return false;
      if (assetTypeFilter === 'script' && ext !== 'psc') return false;
      if (assetTypeFilter === 'sound' && ext !== 'wav' && ext !== 'xwm') return false;
    }
    return true;
  }) || [];

  // Group issues by severity
  const groupedIssues = {
    error: filteredIssues.filter(i => i.severity === 'error'),
    warning: filteredIssues.filter(i => i.severity === 'warning'),
    info: filteredIssues.filter(i => i.severity === 'info')
  };

  const getSeverityIcon = (severity: ValidationSeverity) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
    }
  };

  const getSeverityColor = (severity: ValidationSeverity) => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', p: 3, overflow: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CheckCircleIcon fontSize="large" />
        Asset Validator
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        Comprehensive validation for NIF, DDS, ESP, Papyrus scripts, and sound files
      </Typography>

      <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Quick Scan" />
        <Tab label="Detailed Results" disabled={!report} />
        <Tab label="Batch Validator" />
      </Tabs>

      {/* PANEL 1: Quick Scan */}
      {activeTab === 0 && (
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Scan
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="File or Folder Path"
                    value={selectedPath}
                    onChange={e => setSelectedPath(e.target.value)}
                    placeholder="Select a file or folder to validate"
                    InputProps={{
                      readOnly: true
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Validation Depth</InputLabel>
                    <Select value={validationDepth} onChange={e => setValidationDepth(e.target.value as ValidationDepth)} label="Validation Depth">
                      <MenuItem value="quick">Quick</MenuItem>
                      <MenuItem value="standard">Standard</MenuItem>
                      <MenuItem value="deep">Deep</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => handleSelectPath(false)}>
                  Select File
                </Button>
                <Button variant="outlined" startIcon={<FolderIcon />} onClick={() => handleSelectPath(true)}>
                  Select Folder
                </Button>
                <Button variant="contained" startIcon={scanning ? <CircularProgress size={20} /> : <PlayArrowIcon />} onClick={handleStartScan} disabled={!selectedPath || scanning}>
                  {scanning ? 'Scanning...' : 'Start Scan'}
                </Button>
              </Box>

              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileInputChange} />

              {scanning && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Scanning: {currentFile || 'Initializing...'}
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {progress.toFixed(0)}% complete
                  </Typography>
                </Box>
              )}

              {report && !scanning && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity={report.summary.errors > 0 ? 'error' : report.summary.warnings > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
                    <Typography variant="h6">Scan Complete</Typography>
                    <Typography variant="body2">
                      {report.filesScanned} files scanned in {(report.scanTime / 1000).toFixed(2)}s
                    </Typography>
                  </Alert>

                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="error">
                          {report.summary.errors}
                        </Typography>
                        <Typography variant="body2">Errors</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.main">
                          {report.summary.warnings}
                        </Typography>
                        <Typography variant="body2">Warnings</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="info.main">
                          {report.summary.info}
                        </Typography>
                        <Typography variant="body2">Info</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="h5" gutterBottom>
                      Compliance Score
                    </Typography>
                    <Typography variant="h2" color={report.compliance.score > 80 ? 'success.main' : report.compliance.score > 50 ? 'warning.main' : 'error.main'}>
                      {report.compliance.score}/100
                    </Typography>
                  </Box>

                  <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={() => setActiveTab(1)}>
                    View Detailed Results
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* PANEL 2: Detailed Results */}
      {activeTab === 1 && report && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Detailed Results</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Filter Type</InputLabel>
                    <Select value={assetTypeFilter} onChange={e => setAssetTypeFilter(e.target.value as AssetType)} label="Filter Type">
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="nif">NIF Files</MenuItem>
                      <MenuItem value="dds">DDS Files</MenuItem>
                      <MenuItem value="esp">ESP/ESM Files</MenuItem>
                      <MenuItem value="script">Scripts</MenuItem>
                      <MenuItem value="sound">Sound Files</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant="outlined" startIcon={<BuildIcon />} onClick={handleAutoFix} disabled={selectedIssues.size === 0}>
                    Auto-Fix ({selectedIssues.size})
                  </Button>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExportReport('json')}>
                    JSON
                  </Button>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExportReport('html')}>
                    HTML
                  </Button>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip
                  icon={<ErrorIcon />}
                  label={`${groupedIssues.error.length} Errors`}
                  color="error"
                  variant={groupedIssues.error.length > 0 ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<WarningIcon />}
                  label={`${groupedIssues.warning.length} Warnings`}
                  color="warning"
                  variant={groupedIssues.warning.length > 0 ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<InfoIcon />}
                  label={`${groupedIssues.info.length} Info`}
                  color="info"
                  variant={groupedIssues.info.length > 0 ? 'filled' : 'outlined'}
                />
              </Box>

              {filteredIssues.length === 0 ? (
                <Alert severity="success">No issues found!</Alert>
              ) : (
                <List>
                  {(['error', 'warning', 'info'] as ValidationSeverity[]).map(severity => (
                    <React.Fragment key={severity}>
                      {groupedIssues[severity].length > 0 && (
                        <>
                          <ListItem>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {severity.toUpperCase()} ({groupedIssues[severity].length})
                            </Typography>
                          </ListItem>
                          {groupedIssues[severity].map(issue => (
                            <Accordion key={issue.id} expanded={expandedIssue === issue.id} onChange={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                  {getSeverityIcon(issue.severity)}
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body1">{issue.message}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {issue.file}
                                    </Typography>
                                  </Box>
                                  {issue.autoFixable && (
                                    <Chip
                                      label="Auto-fixable"
                                      size="small"
                                      color="success"
                                      onClick={e => {
                                        e.stopPropagation();
                                        const newSelected = new Set(selectedIssues);
                                        if (newSelected.has(issue.id)) {
                                          newSelected.delete(issue.id);
                                        } else {
                                          newSelected.add(issue.id);
                                        }
                                        setSelectedIssues(newSelected);
                                      }}
                                      variant={selectedIssues.has(issue.id) ? 'filled' : 'outlined'}
                                    />
                                  )}
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Box>
                                  {issue.details && (
                                    <Typography variant="body2" paragraph>
                                      <strong>Details:</strong> {issue.details}
                                    </Typography>
                                  )}
                                  {issue.suggestion && (
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                      <strong>Suggestion:</strong> {issue.suggestion}
                                    </Alert>
                                  )}
                                  {issue.line && (
                                    <Typography variant="caption" color="text.secondary">
                                      Line: {issue.line}
                                    </Typography>
                                  )}
                                </Box>
                              </AccordionDetails>
                            </Accordion>
                          ))}
                          <Divider sx={{ my: 2 }} />
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* PANEL 3: Batch Validator */}
      {activeTab === 2 && (
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Batch Validator
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                Drag and drop an entire mod folder here, or select it using the button below. All supported assets will be validated in parallel.
              </Alert>

              <Paper
                sx={{
                  p: 4,
                  border: '2px dashed',
                  borderColor: 'divider',
                  textAlign: 'center',
                  backgroundColor: 'background.default',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
                onClick={() => handleSelectPath(true)}
              >
                <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6">Drop mod folder here</Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to browse
                </Typography>
              </Paper>

              {selectedPath && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Selected: {selectedPath}
                  </Typography>

                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Asset Type Filter</InputLabel>
                        <Select value={assetTypeFilter} onChange={e => setAssetTypeFilter(e.target.value as AssetType)} label="Asset Type Filter">
                          <MenuItem value="all">All Assets</MenuItem>
                          <MenuItem value="nif">NIF Files Only</MenuItem>
                          <MenuItem value="dds">DDS Files Only</MenuItem>
                          <MenuItem value="esp">ESP/ESM Files Only</MenuItem>
                          <MenuItem value="script">Scripts Only</MenuItem>
                          <MenuItem value="sound">Sound Files Only</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Validation Depth</InputLabel>
                        <Select value={validationDepth} onChange={e => setValidationDepth(e.target.value as ValidationDepth)} label="Validation Depth">
                          <MenuItem value="quick">Quick (Fast)</MenuItem>
                          <MenuItem value="standard">Standard (Recommended)</MenuItem>
                          <MenuItem value="deep">Deep (Thorough)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <Button variant="contained" fullWidth sx={{ mt: 2 }} startIcon={scanning ? <CircularProgress size={20} /> : <PlayArrowIcon />} onClick={handleStartScan} disabled={scanning}>
                    {scanning ? 'Processing...' : 'Start Batch Validation'}
                  </Button>
                </Box>
              )}

              {scanning && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Processing: {currentFile || 'Scanning directory...'}
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {progress.toFixed(0)}% complete
                  </Typography>
                </Box>
              )}

              {report && !scanning && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Batch validation complete! {report.filesScanned} files processed in {(report.scanTime / 1000).toFixed(2)}s
                  </Alert>

                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Compliance Report
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <Typography variant="h4" color="primary.main">
                          {report.filesScanned}
                        </Typography>
                        <Typography variant="body2">Files Scanned</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h4" color="error.main">
                          {report.summary.errors}
                        </Typography>
                        <Typography variant="body2">Errors</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h4" color="warning.main">
                          {report.summary.warnings}
                        </Typography>
                        <Typography variant="body2">Warnings</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="h4" color={report.compliance.score > 80 ? 'success.main' : 'warning.main'}>
                          {report.compliance.score}
                        </Typography>
                        <Typography variant="body2">Compliance</Typography>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" gutterBottom>
                      Passed Checks:
                    </Typography>
                    <List dense>
                      {report.compliance.passedChecks.map((check, idx) => (
                        <ListItem key={idx}>
                          <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                          <ListItemText primary={check} />
                        </ListItem>
                      ))}
                    </List>

                    {report.compliance.failedChecks.length > 0 && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Failed Checks:
                        </Typography>
                        <List dense>
                          {report.compliance.failedChecks.map((check, idx) => (
                            <ListItem key={idx}>
                              <ErrorIcon color="error" fontSize="small" sx={{ mr: 1 }} />
                              <ListItemText primary={check} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </Paper>

                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button variant="contained" onClick={() => setActiveTab(1)}>
                      View All Issues
                    </Button>
                    <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExportReport('html')}>
                      Export Report
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default AssetValidator;
