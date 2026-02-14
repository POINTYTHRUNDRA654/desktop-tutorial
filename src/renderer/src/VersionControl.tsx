import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Divider,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  GitBranch,
  GitCommit,
  Clock,
  Archive,
  RotateCcw,
  Folder,
  FileText,
  Plus,
  Minus,
  Eye,
  EyeOff,
  CheckCircle,
  Error,
  Warning,
  RefreshCw,
  Upload,
  Download,
  Settings,
  GitMerge,
  GitPullRequest,
  User,
  MessageSquare
} from 'lucide-react';
import { GitRepo, CommitHistory, Backup as BackupType, DiffResult } from '../../shared/types';

interface VersionControlProps {
  className?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`version-control-tabpanel-${index}`}
      aria-labelledby={`version-control-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const VersionControl: React.FC<VersionControlProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [repoStatus, setRepoStatus] = useState<GitRepo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Repository Status
  const [currentBranch, setCurrentBranch] = useState('master');
  const [uncommittedChanges, setUncommittedChanges] = useState(0);
  const [lastCommit, setLastCommit] = useState<CommitHistory | null>(null);
  const [remoteStatus, setRemoteStatus] = useState({ ahead: 0, behind: 0 });

  // Changes Viewer
  const [stagedFiles, setStagedFiles] = useState<string[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<string[]>([]);
  const [untrackedFiles, setUntrackedFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Commit Panel
  const [commitMessage, setCommitMessage] = useState('');
  const [commitTemplate, setCommitTemplate] = useState('default');
  const [amendLastCommit, setAmendLastCommit] = useState(false);

  // History Timeline
  const [commitHistory, setCommitHistory] = useState<CommitHistory[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<CommitHistory | null>(null);
  const [commitDetails, setCommitDetails] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Branch Manager
  const [branches, setBranches] = useState<string[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [createBranchDialog, setCreateBranchDialog] = useState(false);
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  // Backup & Restore
  const [backups, setBackups] = useState<BackupType[]>([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupSchedule, setBackupSchedule] = useState('daily');
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupType | null>(null);

  const commitTemplates = {
    default: '',
    feat: 'feat: add new feature',
    fix: 'fix: resolve issue',
    docs: 'docs: update documentation',
    style: 'style: format code',
    refactor: 'refactor: restructure code',
    test: 'test: add tests',
    chore: 'chore: maintenance tasks'
  };

  useEffect(() => {
    loadRepositoryStatus();
    loadCommitHistory();
    loadBranches();
    loadBackups();
  }, []);

  const loadRepositoryStatus = async () => {
    try {
      setLoading(true);
      // This would call the actual API to get repository status
      // For now, we'll use mock data
      setCurrentBranch('main');
      setUncommittedChanges(3);
      setRemoteStatus({ ahead: 2, behind: 0 });
      setLastCommit({
        hash: 'abc123',
        message: 'Add new feature',
        author: 'Developer',
        email: 'dev@example.com',
        date: Date.now() - 3600000,
        files: ['src/main.ts', 'src/renderer/App.tsx'],
        insertions: 150,
        deletions: 25
      });
    } catch (err) {
      setError('Failed to load repository status');
    } finally {
      setLoading(false);
    }
  };

  const loadCommitHistory = async () => {
    try {
      const history = await window.electronAPI.versionControlHistory(50);
      setCommitHistory(history);
    } catch (err) {
      setError('Failed to load commit history');
    }
  };

  const loadBranches = async () => {
    // Mock branches for now
    setBranches(['main', 'feature/new-ui', 'bugfix/login']);
  };

  const loadBackups = async () => {
    try {
      const backupList = await window.electronAPI.versionControlListBackups();
      setBackups(backupList);
    } catch (err) {
      setError('Failed to load backups');
    }
  };

  const handleQuickCommit = async () => {
    if (!commitMessage.trim()) return;

    try {
      setLoading(true);
      await window.electronAPI.versionControlCommit(commitMessage);
      setCommitMessage('');
      await loadRepositoryStatus();
      await loadCommitHistory();
    } catch (err) {
      setError('Failed to commit changes');
    } finally {
      setLoading(false);
    }
  };

  const handleStageFile = (file: string) => {
    setSelectedFiles(prev => [...prev, file]);
  };

  const handleUnstageFile = (file: string) => {
    setSelectedFiles(prev => prev.filter(f => f !== file));
  };

  const handleStageAll = () => {
    setStagedFiles([...modifiedFiles, ...untrackedFiles]);
  };

  const handleUnstageAll = () => {
    setStagedFiles([]);
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    try {
      setLoading(true);
      await window.electronAPI.versionControlCreateBranch(newBranchName);
      setNewBranchName('');
      setCreateBranchDialog(false);
      await loadBranches();
    } catch (err) {
      setError('Failed to create branch');
    } finally {
      setLoading(false);
    }
  };

  const handleMergeBranches = async () => {
    if (!mergeSource || !mergeTarget) return;

    try {
      setLoading(true);
      await window.electronAPI.versionControlMergeBranch(mergeSource, mergeTarget);
      await loadRepositoryStatus();
    } catch (err) {
      setError('Failed to merge branches');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      await window.electronAPI.versionControlBackup(process.cwd());
      await loadBackups();
    } catch (err) {
      setError('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    try {
      setLoading(true);
      await window.electronAPI.versionControlRestore(selectedBackup.id, process.cwd());
      setRestoreDialog(false);
      setSelectedBackup(null);
    } catch (err) {
      setError('Failed to restore backup');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCommitDetails = async (commit: CommitHistory) => {
    try {
      const details = await window.electronAPI.versionControlShowChanges(commit.hash);
      setSelectedCommit(commit);
      setCommitDetails(details);
    } catch (err) {
      setError('Failed to load commit details');
    }
  };

  const filteredHistory = commitHistory.filter(commit =>
    commit.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    commit.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box className={className} sx={{ width: '100%', height: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Version Control
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', height: 'calc(100% - 60px)' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Repository Status" />
          <Tab label="Changes Viewer" />
          <Tab label="Commit Panel" />
          <Tab label="History Timeline" />
          <Tab label="Branch Manager" />
          <Tab label="Backup & Restore" />
        </Tabs>

        {/* Repository Status Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Current Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <GitBranch size={20} style={{ marginRight: 8 }} />
                    <Typography>Branch: {currentBranch}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Badge badgeContent={uncommittedChanges} color="primary">
                      <FileText size={20} style={{ marginRight: 8 }} />
                    </Badge>
                    <Typography>Uncommitted Changes</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Upload size={20} style={{ marginRight: 8, color: 'green' }} />
                    <Typography>Ahead: {remoteStatus.ahead}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Download size={20} style={{ marginRight: 8, color: 'orange' }} />
                    <Typography>Behind: {remoteStatus.behind}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Last Commit
                  </Typography>
                  {lastCommit ? (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {lastCommit.hash.substring(0, 7)}
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        {lastCommit.message}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <User size={16} style={{ marginRight: 4 }} />
                        <Typography variant="body2">{lastCommit.author}</Typography>
                        <Clock size={16} style={{ marginLeft: 8, marginRight: 4 }} />
                        <Typography variant="body2">
                          {new Date(lastCommit.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <Typography>No commits yet</Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    startIcon={<GitCommit />}
                    variant="contained"
                    onClick={handleQuickCommit}
                    disabled={!commitMessage.trim() || loading}
                  >
                    Quick Commit
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Changes Viewer Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Modified Files
                  </Typography>
                  <List>
                    {modifiedFiles.map((file) => (
                      <ListItem key={file}>
                        <ListItemText primary={file} />
                        <ListItemSecondaryAction>
                          <IconButton
                            onClick={() => handleStageFile(file)}
                            disabled={stagedFiles.includes(file)}
                          >
                            <Plus size={16} />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions>
                  <Button onClick={handleStageAll}>Stage All</Button>
                </CardActions>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Staged Files
                  </Typography>
                  <List>
                    {stagedFiles.map((file) => (
                      <ListItem key={file}>
                        <ListItemText primary={file} />
                        <ListItemSecondaryAction>
                          <IconButton onClick={() => handleUnstageFile(file)}>
                            <Minus size={16} />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions>
                  <Button onClick={handleUnstageAll}>Unstage All</Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Commit Panel Tab */}
        <TabPanel value={activeTab} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Commit Changes
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Template</InputLabel>
                <Select
                  value={commitTemplate}
                  onChange={(e) => {
                    setCommitTemplate(e.target.value);
                    setCommitMessage(commitTemplates[e.target.value as keyof typeof commitTemplates]);
                  }}
                >
                  {Object.entries(commitTemplates).map(([key, template]) => (
                    <MenuItem key={key} value={key}>
                      {template || 'Custom'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Commit Message"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                sx={{ mb: 2 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={amendLastCommit}
                    onChange={(e) => setAmendLastCommit(e.target.checked)}
                  />
                }
                label="Amend last commit"
              />
            </CardContent>
            <CardActions>
              <Button
                startIcon={<GitCommit />}
                variant="contained"
                onClick={handleQuickCommit}
                disabled={!commitMessage.trim() || loading}
              >
                {amendLastCommit ? 'Amend Commit' : 'Create Commit'}
              </Button>
            </CardActions>
          </Card>
        </TabPanel>

        {/* History Timeline Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Commit History</Typography>
                    <TextField
                      size="small"
                      placeholder="Search commits..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </Box>
                  <List>
                    {filteredHistory.map((commit) => (
                      <ListItem
                        key={commit.hash}
                        button
                        onClick={() => handleViewCommitDetails(commit)}
                        selected={selectedCommit?.hash === commit.hash}
                      >
                        <ListItemText
                          primary={
                            <Box>
                              <Typography variant="body1">{commit.message}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {commit.hash.substring(0, 7)} • {commit.author} • {new Date(commit.date).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                          secondary={`${commit.files.length} files • +${commit.insertions} -${commit.deletions}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Commit Details
                  </Typography>
                  {selectedCommit && commitDetails ? (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {selectedCommit.hash}
                      </Typography>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {selectedCommit.message}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Author:</strong> {selectedCommit.author}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Date:</strong> {new Date(selectedCommit.date).toLocaleString()}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Files:</strong> {selectedCommit.files.length}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Changed Files:
                      </Typography>
                      <List dense>
                        {commitDetails.files?.map((file: DiffResult) => (
                          <ListItem key={file.file}>
                            <ListItemText
                              primary={file.file}
                              secondary={`+${file.additions} -${file.deletions}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  ) : (
                    <Typography>Select a commit to view details</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Branch Manager Tab */}
        <TabPanel value={activeTab} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Branches
                  </Typography>
                  <List>
                    {branches.map((branch) => (
                      <ListItem key={branch}>
                        <ListItemText primary={branch} />
                        <Chip
                          label={branch === currentBranch ? 'Current' : 'Other'}
                          size="small"
                          color={branch === currentBranch ? 'primary' : 'default'}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions>
                  <Button
                    startIcon={<Plus />}
                    onClick={() => setCreateBranchDialog(true)}
                  >
                    Create Branch
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Merge Branches
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Source Branch</InputLabel>
                    <Select
                      value={mergeSource}
                      onChange={(e) => setMergeSource(e.target.value)}
                    >
                      {branches.filter(b => b !== currentBranch).map((branch) => (
                        <MenuItem key={branch} value={branch}>
                          {branch}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Target Branch</InputLabel>
                    <Select
                      value={mergeTarget}
                      onChange={(e) => setMergeTarget(e.target.value)}
                    >
                      {branches.map((branch) => (
                        <MenuItem key={branch} value={branch}>
                          {branch}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
                <CardActions>
                  <Button
                    startIcon={<GitMerge />}
                    variant="contained"
                    onClick={handleMergeBranches}
                    disabled={!mergeSource || !mergeTarget || loading}
                  >
                    Merge
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>

          {/* Create Branch Dialog */}
          <Dialog open={createBranchDialog} onClose={() => setCreateBranchDialog(false)}>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="Branch Name"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                sx={{ mt: 1 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCreateBranchDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateBranch} disabled={!newBranchName.trim()}>
                Create
              </Button>
            </DialogActions>
          </Dialog>
        </TabPanel>

        {/* Backup & Restore Tab */}
        <TabPanel value={activeTab} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Backup Settings
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoBackupEnabled}
                        onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                      />
                    }
                    label="Enable automatic backups"
                  />
                  {autoBackupEnabled && (
                    <FormControl fullWidth sx={{ mt: 2 }}>
                      <InputLabel>Schedule</InputLabel>
                      <Select
                        value={backupSchedule}
                        onChange={(e) => setBackupSchedule(e.target.value)}
                      >
                        <MenuItem value="hourly">Hourly</MenuItem>
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="weekly">Weekly</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    startIcon={<Archive />}
                    variant="contained"
                    onClick={handleCreateBackup}
                    disabled={loading}
                  >
                    Create Backup
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Available Backups
                  </Typography>
                  <List>
                    {backups.map((backup) => (
                      <ListItem key={backup.id}>
                        <ListItemText
                          primary={backup.description}
                          secondary={new Date(backup.timestamp).toLocaleString()}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            onClick={() => {
                              setSelectedBackup(backup);
                              setRestoreDialog(true);
                            }}
                          >
                            <RotateCcw size={16} />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Restore Dialog */}
          <Dialog open={restoreDialog} onClose={() => setRestoreDialog(false)}>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to restore the backup from{' '}
                {selectedBackup && new Date(selectedBackup.timestamp).toLocaleString()}?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This will overwrite current files with the backup contents.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRestoreDialog(false)}>Cancel</Button>
              <Button onClick={handleRestoreBackup} color="warning">
                Restore
              </Button>
            </DialogActions>
          </Dialog>
        </TabPanel>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};