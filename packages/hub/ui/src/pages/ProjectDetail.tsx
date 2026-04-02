import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  useProject, 
  useProjectSessions, 
  useDeleteProject, 
  useCreateSession,
  useRefreshProject,
  useProjectDevInfo,
  useSettings,
  useBuildProject,
  useUpdateProjectCommands,
} from '@/hooks/use-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Play, 
  Trash2, 
  RefreshCw, 
  FolderOpen,
  Clock,
  Activity,
  Code,
  Package,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Terminal,
  Settings2,
  Hammer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOL_CONFIG: Record<string, { name: string; icon: string; color: string }> = {
  addfox: { name: 'Addfox', icon: '🔥', color: 'bg-orange-500' },
  wxt: { name: 'WXT', icon: '⚡', color: 'bg-yellow-500' },
  plasmo: { name: 'Plasmo', icon: '🚀', color: 'bg-purple-500' },
  vanilla: { name: 'Vanilla', icon: '📦', color: 'bg-blue-500' },
  generic: { name: 'Generic', icon: '🔧', color: 'bg-gray-500' },
};

const BROWSERS = [
  { id: 'chrome', name: 'Google Chrome' },
  { id: 'edge', name: 'Microsoft Edge' },
  { id: 'brave', name: 'Brave' },
  { id: 'chromium', name: 'Chromium' },
];

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(id!);
  const { data: sessions } = useProjectSessions(id!);
  const { data: devInfo } = useProjectDevInfo(id!);
  const { data: settings } = useSettings();
  const deleteProject = useDeleteProject();
  const createSession = useCreateSession();
  const buildProject = useBuildProject();
  const refreshProject = useRefreshProject();
  const updateCommands = useUpdateProjectCommands();
  const [activeTab, setActiveTab] = useState('overview');
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [selectedBrowser, setSelectedBrowser] = useState<string>('');
  const [editCommands, setEditCommands] = useState(false);
  const [editDevCommand, setEditDevCommand] = useState('');
  const [editBuildCommand, setEditBuildCommand] = useState('');

  // Set default browser when settings load
  useState(() => {
    if (settings?.defaultBrowser) {
      setSelectedBrowser(settings.defaultBrowser);
    }
  });

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    await deleteProject.mutateAsync(id!);
    navigate('/projects');
  };

  const handleStartDev = () => {
    setShowStartDialog(true);
  };

  const confirmStartDev = () => {
    createSession.mutate({ 
      projectId: id!,
      browser: selectedBrowser || settings?.defaultBrowser || 'chrome',
    });
    setShowStartDialog(false);
  };

  const handleSaveCommands = async () => {
    await updateCommands.mutateAsync({
      id: id!,
      devCommand: editDevCommand.trim() || undefined,
      buildCommand: editBuildCommand.trim() || undefined,
    });
    setEditCommands(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h3 className="mt-4 text-lg font-semibold">Project not found</h3>
            <p className="text-sm text-muted-foreground">
              The project you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toolConfig = TOOL_CONFIG[project.tool] || { name: project.tool, icon: '📦', color: 'bg-gray-500' };
  const activeSessions = sessions?.filter(s => ['starting', 'building', 'running'].includes(s.status)) || [];
  const manifest = project.manifest;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{toolConfig.icon}</span>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge className={cn(toolConfig.color, 'text-white')}>
                {toolConfig.name}
              </Badge>
              {project.workspace && (
                <Badge variant="outline">{project.workspace.name}</Badge>
              )}
            </div>
            {manifest?.description && (
              <p className="mt-2 text-muted-foreground">{manifest.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshProject.mutate(project.id)}
            disabled={refreshProject.isPending}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshProject.isPending && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`file://${project.path}`, '_blank')}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Open Folder
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteProject.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button 
          onClick={handleStartDev} 
          disabled={createSession.isPending || activeSessions.length > 0}
          className="flex-1 max-w-xs"
        >
          {createSession.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {activeSessions.length > 0 ? 'Already Running' : 'Start Development'}
        </Button>
        <Button 
          variant="secondary"
          onClick={() => buildProject.mutate(id!)}
          disabled={buildProject.isPending}
        >
          {buildProject.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Hammer className="mr-2 h-4 w-4" />
          )}
          Build
        </Button>
        
        {activeSessions.length > 0 && (
          <Button variant="outline" asChild>
            <Link to={`/sessions/${activeSessions[0].id}`}>
              <Activity className="mr-2 h-4 w-4" />
              View Session
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {/* Start Development Dialog */}
      {showStartDialog && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Start Development Session
            </CardTitle>
            <CardDescription>
              Configure how to launch {project.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Framework Info */}
            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Framework</span>
                <Badge variant="outline">{devInfo?.tool || project.tool}</Badge>
              </div>
              {devInfo?.resolvedDevCommand && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">Dev Command</span>
                  <code className="text-xs bg-background px-2 py-1 rounded">{devInfo.resolvedDevCommand}</code>
                </div>
              )}
              {!devInfo?.resolvedDevCommand && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">Launch Mode</span>
                  <Badge className="bg-blue-500">Direct Browser Load</Badge>
                </div>
              )}
            </div>

            {/* Browser Selection */}
            <div className="space-y-2">
              <Label>Target Browser</Label>
              <div className="grid grid-cols-2 gap-2">
                {BROWSERS.map((browser) => (
                  <Button
                    key={browser.id}
                    type="button"
                    variant={selectedBrowser === browser.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedBrowser(browser.id)}
                  >
                    {browser.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowStartDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={confirmStartDev}
                disabled={createSession.isPending}
              >
                {createSession.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="manifest">Manifest</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({sessions?.length || 0})</TabsTrigger>
          <TabsTrigger value="deps">Dependencies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Project Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Path</p>
                  <p className="text-sm font-mono break-all">{project.path}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Framework</p>
                  <p className="text-sm font-medium">{toolConfig.name}</p>
                </div>
                {project.workspace && (
                  <div>
                    <p className="text-sm text-muted-foreground">Workspace</p>
                    <p className="text-sm font-medium">{project.workspace.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Discovered</p>
                  <p className="text-sm">{new Date(project.discoveredAt).toLocaleString()}</p>
                </div>
                {project.lastModified && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Modified</p>
                    <p className="text-sm">{new Date(project.lastModified).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-2xl font-bold">{project.devSessionCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Dev Sessions</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-2xl font-bold">{project.buildCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Builds</p>
                  </div>
                </div>
                
                {project.lastDevAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Dev Session</p>
                    <p className="text-sm">{new Date(project.lastDevAt).toLocaleString()}</p>
                  </div>
                )}

                {activeSessions.length > 0 && (
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                    <p className="text-sm font-medium text-green-600">Active Session</p>
                    <p className="text-xs text-muted-foreground">
                      {activeSessions[0].browser} • {activeSessions[0].id.slice(0, 8)}...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Commands
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editCommands ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Dev Command</p>
                    <div className="flex items-center justify-between">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {devInfo?.resolvedDevCommand || 'None (direct load)'}
                      </code>
                      {project.devCommand && (
                        <Badge variant="outline" className="text-xs">Custom</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Build Command</p>
                    <div className="flex items-center justify-between">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {devInfo?.resolvedBuildCommand || 'None'}
                      </code>
                      {project.buildCommand && (
                        <Badge variant="outline" className="text-xs">Custom</Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setEditDevCommand(project.devCommand || '');
                      setEditBuildCommand(project.buildCommand || '');
                      setEditCommands(true);
                    }}
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Edit Commands
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="detail-dev-cmd">Dev Command</Label>
                    <input
                      id="detail-dev-cmd"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={editDevCommand}
                      onChange={(e) => setEditDevCommand(e.target.value)}
                      placeholder={devInfo?.resolvedDevCommand || 'Auto-detected'}
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: {devInfo?.resolvedDevCommand || 'None'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-build-cmd">Build Command</Label>
                    <input
                      id="detail-build-cmd"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={editBuildCommand}
                      onChange={(e) => setEditBuildCommand(e.target.value)}
                      placeholder={devInfo?.resolvedBuildCommand || 'Auto-detected'}
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: {devInfo?.resolvedBuildCommand || 'None'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditCommands(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveCommands} disabled={updateCommands.isPending}>
                      {updateCommands.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {manifest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Extension Manifest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{manifest.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Version</p>
                    <Badge variant="outline">{manifest.version}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Manifest Version</p>
                    <Badge variant="outline">{manifest.manifest_version}</Badge>
                  </div>
                  {manifest.permissions && (
                    <div>
                      <p className="text-sm text-muted-foreground">Permissions</p>
                      <p className="text-sm">{manifest.permissions.length} granted</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manifest">
          <Card>
            <CardHeader>
              <CardTitle>manifest.json</CardTitle>
              <CardDescription>Full extension manifest</CardDescription>
            </CardHeader>
            <CardContent>
              {manifest ? (
                <pre className="rounded-lg bg-muted p-4 overflow-auto max-h-[600px]">
                  <code className="text-sm">{JSON.stringify(manifest, null, 2)}</code>
                </pre>
              ) : (
                <p className="text-muted-foreground">No manifest found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
              <CardDescription>All development sessions for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions && sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-primary transition-colors cursor-pointer"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={session.status === 'running' ? 'default' : 'secondary'}>
                            {session.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{session.browser}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.startedAt).toLocaleString()}
                          {session.stoppedAt && ` - ${new Date(session.stoppedAt).toLocaleString()}`}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="mt-4 text-lg font-semibold">No sessions yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a development session to see it here
                  </p>
                  <Button className="mt-4" onClick={handleStartDev}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deps">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Dependencies
              </CardTitle>
              <CardDescription>Packages used by this project</CardDescription>
            </CardHeader>
            <CardContent>
              {project.packageJson ? (
                <div className="space-y-6">
                  {project.packageJson.dependencies && Object.keys(project.packageJson.dependencies).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Dependencies</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(project.packageJson.dependencies).map(([name, version]) => (
                          <Badge key={name} variant="secondary">
                            {name}@{version as string}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {project.packageJson.devDependencies && Object.keys(project.packageJson.devDependencies).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Dev Dependencies</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(project.packageJson.devDependencies).map(([name, version]) => (
                          <Badge key={name} variant="outline">
                            {name}@{version as string}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No package.json information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
