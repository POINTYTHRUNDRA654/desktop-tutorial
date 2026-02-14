/**
 * FOMOD Builder - Visual Installer Creator
 * Complete drag-and-drop interface for building professional mod installers
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Alert,
  LinearProgress,
  Tooltip,
  Grid,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Menu,
  Snackbar,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  DragIndicator,
  ExpandMore,
  Folder,
  FolderOpen,
  InsertDriveFile,
  Visibility,
  Settings,
  Save,
  PlayArrow,
  CloudUpload,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  ArrowUpward,
  ArrowDownward,
  ContentCopy,
  Image as ImageIcon,
} from '@mui/icons-material';
import type {
  FOMODProject,
  FOMODStep,
  FOMODGroup,
  FOMODOption,
  FOMODFilePattern,
  FOMODValidation,
  FOMODPreviewResult,
} from '../../shared/types';

// ============================================================================
// INTERFACES
// ============================================================================

interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
  selected?: boolean;
}

interface DraggingFile {
  path: string;
  isDirectory: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FOMODBuilder() {
  // ============================================================================
  // STATE
  // ============================================================================

  // Project state
  const [project, setProject] = useState<FOMODProject | null>(null);
  const [modPath, setModPath] = useState('');
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);

  // UI state
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0); // 0=Edit, 1=Preview, 2=Export

  // Dialogs
  const [showNewStepDialog, setShowNewStepDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [showNewOptionDialog, setShowNewOptionDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Preview state
  const [previewResult, setPreviewResult] = useState<FOMODPreviewResult | null>(null);
  const [previewSelections, setPreviewSelections] = useState<Map<string, string[]>>(new Map());

  // Validation
  const [validation, setValidation] = useState<FOMODValidation | null>(null);

  // Misc
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [draggingFile, setDraggingFile] = useState<DraggingFile | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Select mod folder and create FOMOD project
   */
  const handleSelectModFolder = async () => {
    setLoading(true);
    setError('');

    try {
      const path = await window.electron.api.pickDirectory({
        title: 'Select Mod Folder',
        properties: ['openDirectory'],
      });

      if (path) {
        setModPath(path);

        // Create FOMOD project
        const newProject = await window.electron.api.fomodCreate(path);
        setProject(newProject);

        // Build file tree
        await buildFileTree(path);

        // Select first step by default
        if (newProject.steps.length > 0) {
          setSelectedStep(newProject.steps[0].id);
        }

        setSnackbarMessage('FOMOD project created successfully!');
        setSnackbarOpen(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Build file tree from mod directory
   */
  const buildFileTree = async (rootPath: string) => {
    // In a real implementation, you'd scan the directory
    // For now, create a mock tree
    const mockTree: FileTreeNode[] = [
      {
        name: 'Data',
        path: 'Data',
        isDirectory: true,
        children: [
          { name: 'Meshes', path: 'Data/Meshes', isDirectory: true, children: [] },
          { name: 'Textures', path: 'Data/Textures', isDirectory: true, children: [] },
          { name: 'MyMod.esp', path: 'Data/MyMod.esp', isDirectory: false },
        ],
      },
      {
        name: 'fomod',
        path: 'fomod',
        isDirectory: true,
        children: [
          { name: 'images', path: 'fomod/images', isDirectory: true, children: [] },
        ],
      },
    ];
    setFileTree(mockTree);
  };

  /**
   * Add new step
   */
  const handleAddStep = () => {
    if (!project) return;

    const newStep: FOMODStep = {
      id: `step_${Date.now()}`,
      name: 'New Step',
      order: project.steps.length,
      groupBehavior: 'SelectAtLeastOne',
      groups: [],
    };

    setProject({
      ...project,
      steps: [...project.steps, newStep],
    });

    setSelectedStep(newStep.id);
    setShowNewStepDialog(false);
    
    setSnackbarMessage('Step added successfully!');
    setSnackbarOpen(true);
  };

  /**
   * Delete step
   */
  const handleDeleteStep = (stepId: string) => {
    if (!project) return;

    setProject({
      ...project,
      steps: project.steps.filter(s => s.id !== stepId),
    });

    if (selectedStep === stepId) {
      setSelectedStep(null);
    }

    setSnackbarMessage('Step deleted');
    setSnackbarOpen(true);
  };

  /**
   * Add new group to current step
   */
  const handleAddGroup = () => {
    if (!project || !selectedStep) return;

    const step = project.steps.find(s => s.id === selectedStep);
    if (!step) return;

    const newGroup: FOMODGroup = {
      id: `group_${Date.now()}`,
      name: 'New Group',
      type: 'SelectExactlyOne',
      order: step.groups.length,
      options: [],
    };

    const updatedSteps = project.steps.map(s =>
      s.id === selectedStep
        ? { ...s, groups: [...s.groups, newGroup] }
        : s
    );

    setProject({ ...project, steps: updatedSteps });
    setSelectedGroup(newGroup.id);
    setShowNewGroupDialog(false);

    setSnackbarMessage('Group added successfully!');
    setSnackbarOpen(true);
  };

  /**
   * Delete group
   */
  const handleDeleteGroup = (groupId: string) => {
    if (!project || !selectedStep) return;

    const updatedSteps = project.steps.map(s =>
      s.id === selectedStep
        ? { ...s, groups: s.groups.filter(g => g.id !== groupId) }
        : s
    );

    setProject({ ...project, steps: updatedSteps });

    if (selectedGroup === groupId) {
      setSelectedGroup(null);
    }

    setSnackbarMessage('Group deleted');
    setSnackbarOpen(true);
  };

  /**
   * Add new option to current group
   */
  const handleAddOption = () => {
    if (!project || !selectedStep || !selectedGroup) return;

    const newOption: FOMODOption = {
      id: `option_${Date.now()}`,
      name: 'New Option',
      description: 'Option description',
      type: 'Optional',
      filePatterns: [],
    };

    const updatedSteps = project.steps.map(step => {
      if (step.id !== selectedStep) return step;

      return {
        ...step,
        groups: step.groups.map(group => {
          if (group.id !== selectedGroup) return group;

          return {
            ...group,
            options: [...group.options, newOption],
          };
        }),
      };
    });

    setProject({ ...project, steps: updatedSteps });
    setSelectedOption(newOption.id);
    setShowNewOptionDialog(false);

    setSnackbarMessage('Option added successfully!');
    setSnackbarOpen(true);
  };

  /**
   * Delete option
   */
  const handleDeleteOption = (optionId: string) => {
    if (!project || !selectedStep || !selectedGroup) return;

    const updatedSteps = project.steps.map(step => {
      if (step.id !== selectedStep) return step;

      return {
        ...step,
        groups: step.groups.map(group => {
          if (group.id !== selectedGroup) return group;

          return {
            ...group,
            options: group.options.filter(o => o.id !== optionId),
          };
        }),
      };
    });

    setProject({ ...project, steps: updatedSteps });

    if (selectedOption === optionId) {
      setSelectedOption(null);
    }

    setSnackbarMessage('Option deleted');
    setSnackbarOpen(true);
  };

  /**
   * Update step property
   */
  const handleUpdateStep = (stepId: string, property: string, value: any) => {
    if (!project) return;

    const updatedSteps = project.steps.map(s =>
      s.id === stepId ? { ...s, [property]: value } : s
    );

    setProject({ ...project, steps: updatedSteps });
  };

  /**
   * Update group property
   */
  const handleUpdateGroup = (groupId: string, property: string, value: any) => {
    if (!project || !selectedStep) return;

    const updatedSteps = project.steps.map(step => {
      if (step.id !== selectedStep) return step;

      return {
        ...step,
        groups: step.groups.map(group =>
          group.id === groupId ? { ...group, [property]: value } : group
        ),
      };
    });

    setProject({ ...project, steps: updatedSteps });
  };

  /**
   * Update option property
   */
  const handleUpdateOption = (optionId: string, property: string, value: any) => {
    if (!project || !selectedStep || !selectedGroup) return;

    const updatedSteps = project.steps.map(step => {
      if (step.id !== selectedStep) return step;

      return {
        ...step,
        groups: step.groups.map(group => {
          if (group.id !== selectedGroup) return group;

          return {
            ...group,
            options: group.options.map(option =>
              option.id === optionId ? { ...option, [property]: value } : option
            ),
          };
        }),
      };
    });

    setProject({ ...project, steps: updatedSteps });
  };

  /**
   * Handle file drop on option (add file pattern)
   */
  const handleFileDrop = (optionId: string, file: DraggingFile) => {
    if (!project || !selectedStep || !selectedGroup) return;

    const newPattern: FOMODFilePattern = {
      source: file.path,
      destination: file.path,
      priority: 0,
      isFolder: file.isDirectory,
      alwaysInstall: false,
      installIfUsable: true,
    };

    const updatedSteps = project.steps.map(step => {
      if (step.id !== selectedStep) return step;

      return {
        ...step,
        groups: step.groups.map(group => {
          if (group.id !== selectedGroup) return group;

          return {
            ...group,
            options: group.options.map(option =>
              option.id === optionId
                ? { ...option, filePatterns: [...option.filePatterns, newPattern] }
                : option
            ),
          };
        }),
      };
    });

    setProject({ ...project, steps: updatedSteps });

    setSnackbarMessage(`Added ${file.path} to option`);
    setSnackbarOpen(true);
  };

  /**
   * Remove file pattern from option
   */
  const handleRemoveFilePattern = (optionId: string, patternIndex: number) => {
    if (!project || !selectedStep || !selectedGroup) return;

    const updatedSteps = project.steps.map(step => {
      if (step.id !== selectedStep) return step;

      return {
        ...step,
        groups: step.groups.map(group => {
          if (group.id !== selectedGroup) return group;

          return {
            ...group,
            options: group.options.map(option =>
              option.id === optionId
                ? {
                    ...option,
                    filePatterns: option.filePatterns.filter((_, i) => i !== patternIndex),
                  }
                : option
            ),
          };
        }),
      };
    });

    setProject({ ...project, steps: updatedSteps });
  };

  /**
   * Preview installer
   */
  const handlePreview = async () => {
    if (!project) return;

    setLoading(true);
    try {
      const result = await window.electron.api.fomodPreview(project, previewSelections);
      setPreviewResult(result);
      setShowPreviewDialog(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate project
   */
  const handleValidate = async () => {
    if (!modPath) return;

    setLoading(true);
    try {
      const result = await window.electron.api.fomodValidate(modPath);
      setValidation(result);

      if (result.valid) {
        setSnackbarMessage('✓ FOMOD is valid!');
      } else {
        setSnackbarMessage(`⚠ ${result.errors.length} error(s) found`);
      }
      setSnackbarOpen(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export FOMOD
   */
  const handleExport = async () => {
    if (!project) return;

    setLoading(true);
    try {
      const outputPath = await window.electron.api.pickDirectory({
        title: 'Select Export Destination',
        properties: ['openDirectory'],
      });

      if (outputPath) {
        const result = await window.electron.api.fomodExport(project, outputPath);

        if (result.success) {
          setSnackbarMessage(`✓ FOMOD exported successfully! (${result.filesIncluded} files)`);
          setSnackbarOpen(true);
        } else {
          setError(result.error || 'Export failed');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowExportDialog(false);
    }
  };

  /**
   * Save project
   */
  const handleSaveProject = async () => {
    if (!project) return;

    try {
      const projectPath = `${modPath}/fomod-project.json`;
      await window.electron.api.fomodSaveProject(project, projectPath);

      setSnackbarMessage('✓ Project saved!');
      setSnackbarOpen(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /**
   * Render file tree
   */
  const renderFileTree = (nodes: FileTreeNode[], level = 0): JSX.Element => {
    return (
      <List dense sx={{ pl: level * 2 }}>
        {nodes.map((node, index) => (
          <React.Fragment key={index}>
            <ListItemButton
              draggable
              onDragStart={() => setDraggingFile({ path: node.path, isDirectory: node.isDirectory })}
              onDragEnd={() => setDraggingFile(null)}
              sx={{
                cursor: 'grab',
                '&:active': { cursor: 'grabbing' },
              }}
            >
              <ListItemIcon>
                {node.isDirectory ? <Folder /> : <InsertDriveFile />}
              </ListItemIcon>
              <ListItemText primary={node.name} secondary={node.path} />
            </ListItemButton>
            {node.children && node.children.length > 0 && renderFileTree(node.children, level + 1)}
          </React.Fragment>
        ))}
      </List>
    );
  };

  /**
   * Render steps panel (left sidebar)
   */
  const renderStepsPanel = (): JSX.Element => {
    if (!project) return <></>;

    return (
      <Paper sx={{ height: '100%', p: 2, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Installer Steps</Typography>
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => setShowNewStepDialog(true)}
            variant="contained"
          >
            Add Step
          </Button>
        </Box>

        <List>
          {project.steps.map((step, index) => (
            <ListItem
              key={step.id}
              selected={selectedStep === step.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <ListItemIcon>
                <DragIndicator />
              </ListItemIcon>
              <ListItemButton onClick={() => setSelectedStep(step.id)}>
                <ListItemText
                  primary={`${index + 1}. ${step.name}`}
                  secondary={`${step.groups.length} group(s)`}
                />
              </ListItemButton>
              <IconButton
                size="small"
                onClick={() => handleDeleteStep(step.id)}
                color="error"
              >
                <Delete />
              </IconButton>
            </ListItem>
          ))}
        </List>

        {project.steps.length === 0 && (
          <Alert severity="info">
            No steps yet. Click "Add Step" to create your first installer step.
          </Alert>
        )}
      </Paper>
    );
  };

  /**
   * Render step editor (main canvas)
   */
  const renderStepEditor = (): JSX.Element => {
    if (!project || !selectedStep) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Typography variant="h6" color="text.secondary">
            Select a step to edit
          </Typography>
        </Box>
      );
    }

    const step = project.steps.find(s => s.id === selectedStep);
    if (!step) return <></>;

    return (
      <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
        {/* Step Properties */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Step Properties
          </Typography>

          <TextField
            fullWidth
            label="Step Name"
            value={step.name}
            onChange={(e) => handleUpdateStep(step.id, 'name', e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Group Behavior</InputLabel>
            <Select
              value={step.groupBehavior}
              onChange={(e) => handleUpdateStep(step.id, 'groupBehavior', e.target.value)}
            >
              <MenuItem value="SelectExactlyOne">Select Exactly One</MenuItem>
              <MenuItem value="SelectAtMostOne">Select At Most One</MenuItem>
              <MenuItem value="SelectAtLeastOne">Select At Least One</MenuItem>
              <MenuItem value="SelectAny">Select Any</MenuItem>
              <MenuItem value="SelectAll">Select All</MenuItem>
            </Select>
          </FormControl>
        </Paper>

        {/* Groups */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Installation Groups</Typography>
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => setShowNewGroupDialog(true)}
            variant="contained"
          >
            Add Group
          </Button>
        </Box>

        {step.groups.map((group) => (
          <Accordion
            key={group.id}
            expanded={selectedGroup === group.id}
            onChange={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{group.name} ({group.options.length} options)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {/* Group Properties */}
              <TextField
                fullWidth
                label="Group Name"
                value={group.name}
                onChange={(e) => handleUpdateGroup(group.id, 'name', e.target.value)}
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Selection Type</InputLabel>
                <Select
                  value={group.type}
                  onChange={(e) => handleUpdateGroup(group.id, 'type', e.target.value)}
                >
                  <MenuItem value="SelectExactlyOne">Select Exactly One</MenuItem>
                  <MenuItem value="SelectAtMostOne">Select At Most One</MenuItem>
                  <MenuItem value="SelectAtLeastOne">Select At Least One</MenuItem>
                  <MenuItem value="SelectAny">Select Any</MenuItem>
                  <MenuItem value="SelectAll">Select All</MenuItem>
                </Select>
              </FormControl>

              {/* Options */}
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => setShowNewOptionDialog(true)}
                variant="outlined"
                sx={{ mb: 2 }}
              >
                Add Option
              </Button>

              {group.options.map((option) => (
                <Card
                  key={option.id}
                  sx={{
                    mb: 2,
                    border: selectedOption === option.id ? 2 : 1,
                    borderColor: selectedOption === option.id ? 'primary.main' : 'divider',
                  }}
                  onClick={() => setSelectedOption(option.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggingFile) {
                      handleFileDrop(option.id, draggingFile);
                    }
                  }}
                >
                  <CardContent>
                    <TextField
                      fullWidth
                      label="Option Name"
                      value={option.name}
                      onChange={(e) => handleUpdateOption(option.id, 'name', e.target.value)}
                      sx={{ mb: 1 }}
                    />

                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Description"
                      value={option.description}
                      onChange={(e) => handleUpdateOption(option.id, 'description', e.target.value)}
                      sx={{ mb: 1 }}
                    />

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={option.type}
                        onChange={(e) => handleUpdateOption(option.id, 'type', e.target.value)}
                      >
                        <MenuItem value="Required">Required</MenuItem>
                        <MenuItem value="Recommended">Recommended</MenuItem>
                        <MenuItem value="Optional">Optional</MenuItem>
                        <MenuItem value="NotUsable">Not Usable</MenuItem>
                        <MenuItem value="CouldBeUsable">Could Be Usable</MenuItem>
                      </Select>
                    </FormControl>

                    {/* File Patterns */}
                    <Typography variant="subtitle2" gutterBottom>
                      Files (drag from right panel):
                    </Typography>
                    {option.filePatterns.length === 0 ? (
                      <Alert severity="info" sx={{ mb: 1 }}>
                        No files yet. Drag files from the right panel to add them.
                      </Alert>
                    ) : (
                      <List dense>
                        {option.filePatterns.map((pattern, index) => (
                          <ListItem
                            key={index}
                            secondaryAction={
                              <IconButton
                                edge="end"
                                onClick={() => handleRemoveFilePattern(option.id, index)}
                                size="small"
                              >
                                <Delete />
                              </IconButton>
                            }
                          >
                            <ListItemIcon>
                              {pattern.isFolder ? <Folder /> : <InsertDriveFile />}
                            </ListItemIcon>
                            <ListItemText
                              primary={pattern.source}
                              secondary={`→ ${pattern.destination}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteOption(option.id)}
                    >
                      Delete Option
                    </Button>
                  </CardActions>
                </Card>
              ))}

              {/* Delete Group Button */}
              <Button
                fullWidth
                color="error"
                startIcon={<Delete />}
                onClick={() => handleDeleteGroup(group.id)}
                sx={{ mt: 2 }}
              >
                Delete Group
              </Button>
            </AccordionDetails>
          </Accordion>
        ))}

        {step.groups.length === 0 && (
          <Alert severity="info">
            No groups yet. Click "Add Group" to create your first installation group.
          </Alert>
        )}
      </Box>
    );
  };

  /**
   * Render file mapper (right panel)
   */
  const renderFileMapper = (): JSX.Element => {
    return (
      <Paper sx={{ height: '100%', p: 2, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Mod Files
        </Typography>

        {fileTree.length === 0 ? (
          <Alert severity="info">
            No files loaded. Select a mod folder to view files.
          </Alert>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Drag files to options in the center panel to add them to the installer.
            </Alert>
            {renderFileTree(fileTree)}
          </>
        )}
      </Paper>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            🎛️ FOMOD Builder
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visual installer creator for Fallout 4 mods
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          {!project && (
            <Button
              variant="contained"
              startIcon={<FolderOpen />}
              onClick={handleSelectModFolder}
              disabled={loading}
            >
              Select Mod Folder
            </Button>
          )}

          {project && (
            <>
              <Button
                variant="outlined"
                startIcon={<Save />}
                onClick={handleSaveProject}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                startIcon={<Visibility />}
                onClick={handlePreview}
              >
                Preview
              </Button>
              <Button
                variant="outlined"
                startIcon={<CheckCircle />}
                onClick={handleValidate}
              >
                Validate
              </Button>
              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                onClick={() => setShowExportDialog(true)}
                color="success"
              >
                Export
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Main Content - 3 Column Layout */}
      {project && (
        <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
          {/* Left: Steps Panel */}
          <Grid item xs={3} sx={{ height: '100%' }}>
            {renderStepsPanel()}
          </Grid>

          {/* Center: Step Editor */}
          <Grid item xs={6} sx={{ height: '100%', overflow: 'auto' }}>
            <Paper sx={{ height: '100%' }}>
              {renderStepEditor()}
            </Paper>
          </Grid>

          {/* Right: File Mapper */}
          <Grid item xs={3} sx={{ height: '100%' }}>
            {renderFileMapper()}
          </Grid>
        </Grid>
      )}

      {/* No Project State */}
      {!project && !loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No FOMOD project loaded
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Select a mod folder to create a new FOMOD installer project
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<FolderOpen />}
            onClick={handleSelectModFolder}
          >
            Select Mod Folder
          </Button>
        </Box>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onClose={() => setShowExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export FOMOD</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            This will generate ModuleConfig.xml, info.xml, and organize all files for distribution.
          </Typography>
          {validation && (
            <Box sx={{ mt: 2 }}>
              {validation.valid ? (
                <Alert severity="success">
                  ✓ FOMOD is valid and ready to export
                </Alert>
              ) : (
                <Alert severity="warning">
                  ⚠ {validation.errors.length} error(s) found. Export may not work correctly.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportDialog(false)}>Cancel</Button>
          <Button onClick={handleExport} variant="contained" color="success">
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
