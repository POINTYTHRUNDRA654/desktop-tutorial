/**
 * Mod Packaging Wizard
 * Comprehensive 8-step wizard for packaging Fallout 4 mods
 * Refactored with separate step components and advanced features
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { ModInfo, StructureValidation, ArchiveSettings, ArchiveResult, NexusPrep } from '../../shared/types';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  TextField,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  FolderOpen,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  ExpandMore,
  Archive,
  Code,
  Article,
  Upload,
  Settings as SettingsIcon,
  Visibility,
  Download,
  Delete,
  Add,
  Save,
  FolderOpenOutlined,
  CloudUpload,
  Refresh,
} from '@mui/icons-material';

interface StepConfig {
  id: string;
  title: string;
  description: string;
}

const steps: StepConfig[] = [
  { id: 'select', title: 'Select Mod Folder', description: 'Choose your mod project folder' },
  { id: 'validate', title: 'Validate Structure', description: 'Review folder structure and issues' },
  { id: 'metadata', title: 'Mod Information', description: 'Enter mod details and metadata' },
  { id: 'files', title: 'Select Files', description: 'Choose files to include/exclude' },
  { id: 'readme', title: 'Documentation', description: 'Generate README and changelog' },
  { id: 'archive', title: 'Archive Settings', description: 'Configure compression and format' },
  { id: 'preview', title: 'Review & Build', description: 'Preview and build package' },
  { id: 'export', title: 'Export', description: 'Upload to Nexus or save locally' },
];

interface PackagingDraft {
  id: string;
  name: string;
  savedAt: number;
  modPath: string;
  modInfo: ModInfo;
  selectedFiles: string[];
  excludePatterns: string[];
  readmeTemplate: string;
  generatedReadme: string;
  changelogEntries: string[];
  archiveFormat: '7z' | 'zip' | 'fomod';
  compressionLevel: 0 | 1 | 3 | 5 | 7 | 9;
  createFomod: boolean;
  currentStep: number;
}

interface ModInfo {
  name: string;
  version: string;
  author: string;
  description: string;
  category: string;
  requirements: string[];
  tags: string[];
  homepage: string;
  supportUrl: string;
  donationUrl: string;
  nexusId: string;
}

interface StructureValidation {
  valid: boolean;
  hasData: boolean;
  hasDocs: boolean;
  hasReadme: boolean;
  hasChangelog: boolean;
  fileCount: number;
  totalSize: number;
  folders: string[];
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    path?: string;
  }>;
  suggestions: string[];
}

export default function ModPackagingWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [modPath, setModPath] = useState('');
  const [validation, setValidation] = useState<StructureValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mod Information
  const [modInfo, setModInfo] = useState<ModInfo>({
    name: '',
    version: '1.0.0',
    author: '',
    description: '',
    category: 'Miscellaneous',
    requirements: [],
    tags: [],
    homepage: '',
    supportUrl: '',
    donationUrl: '',
    nexusId: '',
  });

  // Draft Management
  const [savedDrafts, setSavedDrafts] = useState<PackagingDraft[]>([]);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Nexus Upload
  const [showNexusUpload, setShowNexusUpload] = useState(false);
  const [nexusApiKey, setNexusApiKey] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Load saved drafts from localStorage on mount
  useEffect(() => {
    const draftsJson = localStorage.getItem('modPackagingDrafts');
    if (draftsJson) {
      try {
        setSavedDrafts(JSON.parse(draftsJson));
      } catch (e) {
        console.error('Failed to load drafts:', e);
      }
    }
  }, []);

  // File Selection
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [excludePatterns, setExcludePatterns] = useState<string[]>([
    '*.bak',
    '*.tmp',
    'Thumbs.db',
    'desktop.ini',
  ]);

  // Documentation
  const [readmeTemplate, setReadmeTemplate] = useState('default');
  const [generatedReadme, setGeneratedReadme] = useState('');
  const [changelogEntries, setChangelogEntries] = useState<string[]>([]);
  const [newChangelogEntry, setNewChangelogEntry] = useState('');

  // Archive Settings
  const [archiveFormat, setArchiveFormat] = useState<'7z' | 'zip' | 'fomod'>('7z');
  const [compressionLevel, setCompressionLevel] = useState(5);
  const [createFomod, setCreateFomod] = useState(false);

  // Build state
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildResult, setBuildResult] = useState<ArchiveResult | null>(null);
  const [nexusPrep, setNexusPrep] = useState<NexusPrep | null>(null);

  // Load saved drafts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('modPackagingDrafts');
    if (saved) {
      setSavedDrafts(JSON.parse(saved));
    }
  }, []);

  // Save current state as draft
  const handleSaveDraft = useCallback(() => {
    if (!draftName.trim()) {
      setError('Please enter a name for the draft');
      return;
    }

    const draft: PackagingDraft = {
      id: Date.now().toString(),
      name: draftName,
      savedAt: Date.now(),
      modPath,
      modInfo,
      selectedFiles,
      excludePatterns,
      readmeTemplate,
      generatedReadme,
      changelogEntries,
      archiveFormat,
      compressionLevel,
      createFomod,
      currentStep: activeStep,
    };

    const updatedDrafts = [...savedDrafts, draft];
    setSavedDrafts(updatedDrafts);
    localStorage.setItem('modPackagingDrafts', JSON.stringify(updatedDrafts));
    
    setShowSaveDialog(false);
    setDraftName('');
    setSnackbarMessage(`Draft "${draft.name}" saved successfully!`);
    setSnackbarOpen(true);
  }, [draftName, modPath, modInfo, selectedFiles, excludePatterns, readmeTemplate, generatedReadme, changelogEntries, archiveFormat, compressionLevel, createFomod, activeStep, savedDrafts]);

  // Load draft
  const handleLoadDraft = useCallback((draft: PackagingDraft) => {
    setModPath(draft.modPath);
    setModInfo(draft.modInfo);
    setSelectedFiles(draft.selectedFiles);
    setExcludePatterns(draft.excludePatterns);
    setReadmeTemplate(draft.readmeTemplate);
    setGeneratedReadme(draft.generatedReadme);
    setChangelogEntries(draft.changelogEntries);
    setArchiveFormat(draft.archiveFormat);
    setCompressionLevel(draft.compressionLevel);
    setCreateFomod(draft.createFomod);
    setActiveStep(draft.currentStep);
    
    setShowLoadDialog(false);
    setSnackbarMessage(`Draft "${draft.name}" loaded successfully!`);
    setSnackbarOpen(true);
  }, []);

  // Delete draft
  const handleDeleteDraft = useCallback((draftId: string) => {
    const updatedDrafts = savedDrafts.filter(d => d.id !== draftId);
    setSavedDrafts(updatedDrafts);
    localStorage.setItem('modPackagingDrafts', JSON.stringify(updatedDrafts));
    setSnackbarMessage('Draft deleted');
    setSnackbarOpen(true);
  }, [savedDrafts]);

  // Upload to Nexus Mods
  const handleNexusUpload = async () => {
    if (!nexusApiKey.trim()) {
      setError('Please enter your Nexus Mods API key');
      return;
    }

    if (!buildResult?.archivePath) {
      setError('Please build the archive first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // NOTE: Nexus Mods API integration is a planned feature
      // The Nexus Mods API requires authentication, API keys, and proper permissions
      // This would require:
      // 1. User to authenticate with Nexus Mods
      // 2. OAuth2 or API key configuration
      // 3. Proper mod categorization and metadata
      // 4. File chunking for large uploads
      // 5. Terms of service agreement
      
      // For now, inform the user this is not yet implemented
      setError('Nexus Mods upload is not yet implemented. Please upload manually via nexusmods.com');
      setShowNexusUpload(false);
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setModPath('');
    setValidation(null);
    setError('');
    setBuildResult(null);
  };

  // Step 1: Project Selection
  const handleSelectProject = async () => {
    setLoading(true);
    setError('');
    try {
      const path = await window.electron.api.pickDirectory({
        title: 'Select Mod Folder',
        properties: ['openDirectory'],
      });

      if (path) {
        setModPath(path);
        
        // Auto-validate after selection
        const validationResult = await window.electron.api.modPackagingValidateStructure(path);
        setValidation(validationResult);

        if (validationResult.valid) {
          handleNext();
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Generate README
  const handleGenerateReadme = async () => {
    setLoading(true);
    try {
      const readme = await window.electron.api.modPackagingGenerateReadme(modInfo, readmeTemplate);
      setGeneratedReadme(readme);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Add changelog entry
  const handleAddChangelogEntry = () => {
    if (newChangelogEntry.trim()) {
      setChangelogEntries([...changelogEntries, newChangelogEntry.trim()]);
      setNewChangelogEntry('');
    }
  };

  // Step 6: Build Archive
  const handleBuildArchive = async () => {
    setLoading(true);
    setBuildProgress(0);
    try {
      const settings: ArchiveSettings = {
        format: archiveFormat,
        compressionLevel,
        createFomod,
        excludePatterns,
      };

      const result = await window.electron.api.modPackagingCreateArchive(
        modPath!,
        modInfo,
        generatedReadme,
        settings
      );
      
      setBuildResult(result);

      if (result.success) {
        handleNext();
      } else {
        setError(result.error || 'Archive creation failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 8: Prepare for Nexus
  const handlePrepareNexus = async () => {
    if (!buildResult?.archivePath) return;

    setLoading(true);
    try {
      const modPackage = {
        modInfo,
        archivePath: buildResult.archivePath,
        files: selectedFiles,
        readme: generatedReadme,
        changelog: changelogEntries.join('\n'),
      };

      const prep = await window.electron.api.modPackagingPrepareNexus(modPackage);
      setNexusPrep(prep);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Increment version
  const handleIncrementVersion = async (type: 'major' | 'minor' | 'patch') => {
    try {
      const newVersion = await window.electron.api.modPackagingIncrementVersion(modInfo.version, type);
      setModInfo({ ...modInfo, version: newVersion });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Step 2: Validate Structure (automatic)
  useEffect(() => {
    if (activeStep === 1 && validation?.valid) {
      // Auto-advance if validation passed
      // Commented out to allow user to review
      // setTimeout(() => handleNext(), 1000);
    }
  }, [activeStep, validation]);

  // ============================================================================
  // STEP COMPONENTS
  // ============================================================================

  const FolderSelector = () => (
    <Box>
      <Typography variant="body2" gutterBottom>
        Choose the root folder of your mod project. This should contain your Data folder and mod files.
      </Typography>
      <Button
        variant="contained"
        startIcon={<FolderOpen />}
        onClick={handleSelectProject}
        disabled={loading}
        sx={{ mt: 2 }}
      >
        Select Mod Folder
      </Button>
      {modPath && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <strong>Selected:</strong> {modPath}
        </Alert>
      )}
    </Box>
  );

  const StructureValidator = () => (
    <Box>
      {validation && (
        <>
          <Alert severity={validation.valid ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {validation.valid
              ? '✅ Mod structure is valid and ready for packaging!'
              : '⚠️ Structure validation found some issues'}
          </Alert>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{validation.fileCount}</Typography>
                  <Typography variant="body2" color="text.secondary">Files</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6">
                    {(validation.totalSize / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Total Size</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{validation.folders.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Folders</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{validation.issues.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Issues</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {validation.issues.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Issues & Warnings ({validation.issues.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {validation.issues.map((issue, idx) => (
                    <ListItem key={idx}>
                      <ListItemIcon>
                        {issue.severity === 'error' && <ErrorIcon color="error" />}
                        {issue.severity === 'warning' && <Warning color="warning" />}
                        {issue.severity === 'info' && <Info color="info" />}
                      </ListItemIcon>
                      <ListItemText primary={issue.message} secondary={issue.path} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {validation.suggestions.length > 0 && (
            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Suggestions ({validation.suggestions.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {validation.suggestions.map((suggestion, idx) => (
                    <ListItem key={idx}>
                      <ListItemIcon>
                        <Info color="info" />
                      </ListItemIcon>
                      <ListItemText primary={suggestion} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}
        </>
      )}
    </Box>
  );

  const MetadataForm = () => (
    <Box>
      <TextField
        fullWidth
        label="Mod Name"
        value={modInfo.name}
        onChange={(e) => setModInfo({ ...modInfo, name: e.target.value })}
        required
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Version"
          value={modInfo.version}
          onChange={(e) => setModInfo({ ...modInfo, version: e.target.value })}
          required
          sx={{ flex: 1 }}
        />
        <Button onClick={() => handleIncrementVersion('major')}>Major</Button>
        <Button onClick={() => handleIncrementVersion('minor')}>Minor</Button>
        <Button onClick={() => handleIncrementVersion('patch')}>Patch</Button>
      </Box>

      <TextField
        fullWidth
        label="Author"
        value={modInfo.author}
        onChange={(e) => setModInfo({ ...modInfo, author: e.target.value })}
        required
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Description"
        value={modInfo.description}
        onChange={(e) => setModInfo({ ...modInfo, description: e.target.value })}
        multiline
        rows={4}
        required
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={modInfo.category}
          onChange={(e) => setModInfo({ ...modInfo, category: e.target.value })}
        >
          <MenuItem value="Armor">Armor</MenuItem>
          <MenuItem value="Weapons">Weapons</MenuItem>
          <MenuItem value="Building">Building</MenuItem>
          <MenuItem value="Gameplay">Gameplay</MenuItem>
          <MenuItem value="Visuals">Visuals</MenuItem>
          <MenuItem value="Quest">Quest</MenuItem>
          <MenuItem value="Overhaul">Overhaul</MenuItem>
          <MenuItem value="Miscellaneous">Miscellaneous</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Requirements (comma-separated)"
        value={modInfo.requirements.join(', ')}
        onChange={(e) =>
          setModInfo({ ...modInfo, requirements: e.target.value.split(',').map((s) => s.trim()) })
        }
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Tags (comma-separated)"
        value={modInfo.tags.join(', ')}
        onChange={(e) =>
          setModInfo({ ...modInfo, tags: e.target.value.split(',').map((s) => s.trim()) })
        }
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Homepage URL (optional)"
        value={modInfo.homepage}
        onChange={(e) => setModInfo({ ...modInfo, homepage: e.target.value })}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Nexus Mod ID (optional)"
        value={modInfo.nexusId}
        onChange={(e) => setModInfo({ ...modInfo, nexusId: e.target.value })}
        placeholder="e.g., 12345"
      />
    </Box>
  );

  const FileSelector = () => (
    <Box>
      <Typography variant="body2" gutterBottom>
        Choose which files to include in your mod package. By default, all files are included.
      </Typography>

      <Alert severity="info" sx={{ my: 2 }}>
        {validation?.fileCount || 0} files will be included
      </Alert>

      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        Exclude Patterns:
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {excludePatterns.map((pattern, idx) => (
          <Chip
            key={idx}
            label={pattern}
            onDelete={() =>
              setExcludePatterns(excludePatterns.filter((_, i) => i !== idx))
            }
          />
        ))}
        <Chip
          label="+ Add Pattern"
          onClick={() => {
            const pattern = prompt('Enter exclude pattern (e.g., *.bak):');
            if (pattern) setExcludePatterns([...excludePatterns, pattern]);
          }}
          variant="outlined"
        />
      </Box>

      {validation?.folders && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Folder Structure ({validation.folders.length} folders)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {validation.folders.slice(0, 20).map((folder, idx) => (
                <ListItem key={idx}>
                  <ListItemText primary={folder} />
                </ListItem>
              ))}
              {validation.folders.length > 20 && (
                <Typography variant="caption" color="text.secondary">
                  ... and {validation.folders.length - 20} more
                </Typography>
              )}
            </List>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );

  const ReadmeGenerator = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        README Generation
      </Typography>

      <FormControl fullWidth sx={{ my: 2 }}>
        <InputLabel>Template</InputLabel>
        <Select
          value={readmeTemplate}
          onChange={(e) => setReadmeTemplate(e.target.value)}
        >
          <MenuItem value="default">Default</MenuItem>
          <MenuItem value="nexus">Nexus Mods (BBCode)</MenuItem>
          <MenuItem value="github">GitHub (Markdown)</MenuItem>
          <MenuItem value="simple">Simple Text</MenuItem>
        </Select>
      </FormControl>

      <Button
        variant="contained"
        startIcon={<Article />}
        onClick={handleGenerateReadme}
        disabled={loading || !modInfo.name}
      >
        Generate README
      </Button>

      {generatedReadme && (
        <Paper sx={{ p: 2, mt: 2, maxHeight: 300, overflow: 'auto' }}>
          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
            {generatedReadme}
          </Typography>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Changelog Entries
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          label="New changelog entry"
          value={newChangelogEntry}
          onChange={(e) => setNewChangelogEntry(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddChangelogEntry();
            }
          }}
        />
        <IconButton
          color="primary"
          onClick={handleAddChangelogEntry}
          disabled={!newChangelogEntry.trim()}
        >
          <Add />
        </IconButton>
      </Box>

      <List dense>
        {changelogEntries.map((entry, idx) => (
          <ListItem
            key={idx}
            secondaryAction={
              <IconButton
                edge="end"
                onClick={() =>
                  setChangelogEntries(changelogEntries.filter((_, i) => i !== idx))
                }
              >
                <Delete />
              </IconButton>
            }
          >
            <ListItemText primary={entry} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const ArchiveSettingsComponent = () => (
    <Box>
      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Archive Format:
        </Typography>
        <RadioGroup
          value={archiveFormat}
          onChange={(e) => setArchiveFormat(e.target.value as any)}
        >
          <FormControlLabel
            value="7z"
            control={<Radio />}
            label="7-Zip (.7z) - Best compression"
          />
          <FormControlLabel
            value="zip"
            control={<Radio />}
            label="ZIP (.zip) - Universal compatibility"
          />
          <FormControlLabel
            value="fomod"
            control={<Radio />}
            label="FOMOD (.7z) - Nexus installer"
          />
        </RadioGroup>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Compression Level</InputLabel>
        <Select
          value={compressionLevel}
          onChange={(e) => setCompressionLevel(e.target.value as any)}
        >
          <MenuItem value={0}>0 - No compression (Fastest)</MenuItem>
          <MenuItem value={1}>1 - Fastest</MenuItem>
          <MenuItem value={3}>3 - Fast</MenuItem>
          <MenuItem value={5}>5 - Normal (Recommended)</MenuItem>
          <MenuItem value={7}>7 - Maximum</MenuItem>
          <MenuItem value={9}>9 - Ultra (Slowest)</MenuItem>
        </Select>
      </FormControl>

      {archiveFormat === 'fomod' && (
        <FormControlLabel
          control={
            <Checkbox
              checked={createFomod}
              onChange={(e) => setCreateFomod(e.target.checked)}
            />
          }
          label="Generate FOMOD installer configuration"
        />
      )}

      <Alert severity="info" sx={{ mt: 2 }}>
        Archive will be created in the parent folder of your mod directory
      </Alert>
    </Box>
  );

  const PackagePreview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Package Summary
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Mod Name</Typography>
            <Typography variant="body1">{modInfo.name || 'Not set'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Version</Typography>
            <Typography variant="body1">{modInfo.version}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Author</Typography>
            <Typography variant="body1">{modInfo.author || 'Not set'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Format</Typography>
            <Typography variant="body1">{archiveFormat.toUpperCase()}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Files</Typography>
            <Typography variant="body1">{validation?.fileCount || 0}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Size</Typography>
            <Typography variant="body1">
              {((validation?.totalSize || 0) / 1024 / 1024).toFixed(2)} MB
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {buildProgress > 0 && buildProgress < 100 && (
        <Box sx={{ my: 2 }}>
          <Typography variant="body2" gutterBottom>
            Building archive...
          </Typography>
          <LinearProgress variant="determinate" value={buildProgress} />
        </Box>
      )}

      {!buildResult && (
        <Button
          variant="contained"
          size="large"
          startIcon={<Archive />}
          onClick={handleBuildArchive}
          disabled={loading || !modInfo.name || !modInfo.author}
          fullWidth
        >
          Build Archive
        </Button>
      )}

      {buildResult?.success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Archive created successfully!
          <br />
          <strong>Path:</strong> {buildResult.archivePath}
          <br />
          <strong>Size:</strong> {(buildResult.archiveSize / 1024 / 1024).toFixed(2)} MB
          <br />
          <strong>Compression:</strong> {buildResult.compressionRatio?.toFixed(1)}%
          <br />
          <strong>Build Time:</strong> {(buildResult.buildTime / 1000).toFixed(2)}s
        </Alert>
      )}
    </Box>
  );

  const ExportComponent = () => (
    <Box>
      <Alert severity="success" sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          🎉 Package Complete!
        </Typography>
        <Typography variant="body2">
          Your mod has been successfully packaged and is ready for distribution.
        </Typography>
      </Alert>

      {buildResult && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Package Details:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Archive Path"
                secondary={buildResult.archivePath}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="File Size"
                secondary={`${(buildResult.archiveSize / 1024 / 1024).toFixed(2)} MB`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Format"
                secondary={archiveFormat.toUpperCase()}
              />
            </ListItem>
          </List>
        </Paper>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={() => setShowNexusUpload(true)}
            disabled={loading || !buildResult?.archivePath}
            fullWidth
            color="primary"
          >
            Upload to Nexus Mods
          </Button>
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handlePrepareNexus}
            disabled={loading}
            fullWidth
          >
            Prepare for Manual Upload
          </Button>
        </Grid>
      </Grid>

      {nexusPrep && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Nexus Mods Checklist:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                {nexusPrep.checks.hasReadme ? (
                  <CheckCircle color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
              </ListItemIcon>
              <ListItemText primary="README file" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                {nexusPrep.checks.hasChangelog ? (
                  <CheckCircle color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
              </ListItemIcon>
              <ListItemText primary="Changelog" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                {nexusPrep.checks.hasProperStructure ? (
                  <CheckCircle color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
              </ListItemIcon>
              <ListItemText primary="Proper mod structure" />
            </ListItem>
          </List>

          {nexusPrep.recommendations.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Recommendations:
              </Typography>
              <List dense>
                {nexusPrep.recommendations.map((rec: string, idx: number) => (
                  <ListItem key={idx}>
                    <ListItemIcon>
                      <Info color="info" />
                    </ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Paper>
      )}
    </Box>
  );

  const renderStepContent = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return <FolderSelector />;
      case 1:
        return <StructureValidator />;
      case 2:
        return <MetadataForm />;
      case 3:
        return <FileSelector />;
      case 4:
        return <ReadmeGenerator />;
      case 5:
        return <ArchiveSettingsComponent />;
      case 6:
        return <PackagePreview />;
      case 7:
        return <ExportComponent />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            📦 Mod Packaging Wizard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create professional mod packages ready for distribution on Nexus Mods and other platforms.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Load Saved Draft">
            <IconButton
              color="primary"
              onClick={() => setShowLoadDialog(true)}
              disabled={savedDrafts.length === 0}
            >
              <FolderOpenOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save Draft">
            <IconButton
              color="primary"
              onClick={() => setShowSaveDialog(true)}
              disabled={!modPath}
            >
              <Save />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Wizard">
            <IconButton
              color="secondary"
              onClick={handleReset}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.id}>
            <StepLabel>
              <Typography variant="subtitle1">{step.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {step.description}
              </Typography>
            </StepLabel>
            <StepContent>
              {renderStepContent(index)}

              <Box sx={{ mb: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  sx={{ mr: 1 }}
                  disabled={
                    loading ||
                    (index === 0 && !modPath) ||
                    (index === 2 && (!modInfo.name || !modInfo.author)) ||
                    (index === 6 && !buildResult?.success)
                  }
                >
                  {index === steps.length - 1 ? 'Finish' : 'Continue'}
                </Button>
                <Button disabled={index === 0} onClick={handleBack}>
                  Back
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {activeStep === steps.length && (
        <Paper square elevation={0} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            All steps completed!
          </Typography>
          <Typography variant="body2" paragraph>
            Your mod package has been created and is ready for upload. Thank you for using Mossy!
          </Typography>
          <Button onClick={handleReset} sx={{ mr: 1 }}>
            Package Another Mod
          </Button>
        </Paper>
      )}

      {/* Save Draft Dialog */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)}>
        <DialogTitle>Save Packaging Draft</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Draft Name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="e.g., My Weapon Mod v1.0"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveDraft} variant="contained" disabled={!draftName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Draft Dialog */}
      <Dialog
        open={showLoadDialog}
        onClose={() => setShowLoadDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Load Saved Draft</DialogTitle>
        <DialogContent>
          {savedDrafts.length === 0 ? (
            <Typography color="text.secondary">No saved drafts found.</Typography>
          ) : (
            <List>
              {savedDrafts.map((draft) => (
                <ListItem
                  key={draft.id}
                  secondaryAction={
                    <Box>
                      <Tooltip title="Load">
                        <IconButton
                          edge="end"
                          onClick={() => handleLoadDraft(draft)}
                          sx={{ mr: 1 }}
                        >
                          <FolderOpen />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteDraft(draft.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={draft.name}
                    secondary={
                      <>
                        <Typography component="span" variant="body2">
                          {draft.modInfo.name || 'Unnamed Mod'} v{draft.modInfo.version}
                        </Typography>
                        <br />
                        <Typography component="span" variant="caption" color="text.secondary">
                          Saved: {new Date(draft.savedAt).toLocaleString()} • Step {draft.currentStep + 1}/{steps.length}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLoadDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Nexus Upload Dialog */}
      <Dialog
        open={showNexusUpload}
        onClose={() => !uploading && setShowNexusUpload(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload to Nexus Mods</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            You'll need a Nexus Mods API key. Get one from your account settings at nexusmods.com
          </Alert>

          <TextField
            fullWidth
            type="password"
            label="Nexus Mods API Key"
            value={nexusApiKey}
            onChange={(e) => setNexusApiKey(e.target.value)}
            disabled={uploading}
            sx={{ mb: 2 }}
          />

          {uploading && (
            <Box sx={{ my: 2 }}>
              <Typography variant="body2" gutterBottom>
                Uploading to Nexus Mods...
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {uploadProgress}% complete
              </Typography>
            </Box>
          )}

          {buildResult && (
            <Paper sx={{ p: 2, bgcolor: 'action.hover', mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                File to upload:
              </Typography>
              <Typography variant="body2">
                {buildResult.archivePath?.split('\\').pop()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Size: {(buildResult.archiveSize / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNexusUpload(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleNexusUpload}
            variant="contained"
            disabled={uploading || !nexusApiKey.trim()}
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
}
