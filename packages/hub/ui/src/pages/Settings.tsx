import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettings, useUpdateSettings, api } from '@/hooks/use-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Save,
  RotateCcw,
  FolderOpen,
  Trash2,
  Plus,
  Search,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BROWSERS = [
  { id: 'chrome', name: 'Google Chrome', icon: '🌐' },
  { id: 'edge', name: 'Microsoft Edge', icon: '🌊' },
  { id: 'brave', name: 'Brave Browser', icon: '🦁' },
  { id: 'chromium', name: 'Chromium', icon: '⚙️' },
];

export function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [formData, setFormData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when settings load
  useEffect(() => {
    if (settings && !formData) {
      setFormData(JSON.parse(JSON.stringify(settings)));
    }
  }, [settings, formData]);

  const handleChange = (path: string, value: any) => {
    const newData = { ...formData };
    const keys = path.split('.');
    let current = newData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setFormData(newData);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync(formData);
    setHasChanges(false);
  };

  const handleReset = () => {
    setFormData(JSON.parse(JSON.stringify(settings)));
    setHasChanges(false);
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure Hub preferences and defaults
          </p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="browser">Browser</TabsTrigger>
          <TabsTrigger value="scan">Scan Paths</TabsTrigger>
          <TabsTrigger value="server">Server</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic configuration options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-open Browser</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically open dashboard when starting Hub
                  </p>
                </div>
                <Switch
                  checked={formData.autoOpenBrowser}
                  onCheckedChange={(v) => handleChange('autoOpenBrowser', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Workspace Auto-detect</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically detect pnpm workspaces in scan paths
                  </p>
                </div>
                <Switch
                  checked={formData.workspace.autoDetect}
                  onCheckedChange={(v) => handleChange('workspace.autoDetect', v)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Log Level</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={formData.logLevel}
                  onChange={(e) => handleChange('logLevel', e.target.value)}
                >
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Max Log History</Label>
                <Input
                  type="number"
                  value={formData.maxLogHistory}
                  onChange={(e) => handleChange('maxLogHistory', parseInt(e.target.value))}
                  min={100}
                  max={10000}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of log entries to keep per session
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="browser" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Browser</CardTitle>
              <CardDescription>
                Choose your preferred browser for development
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {BROWSERS.map((browser) => (
                  <div
                    key={browser.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors",
                      formData.defaultBrowser === browser.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    )}
                    onClick={() => handleChange('defaultBrowser', browser.id)}
                  >
                    <span className="text-2xl">{browser.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{browser.name}</p>
                      <p className="text-sm text-muted-foreground">{browser.id}</p>
                    </div>
                    {formData.defaultBrowser === browser.id && (
                      <Badge>Default</Badge>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Custom Browser Paths</h4>
                <p className="text-sm text-muted-foreground">
                  Override automatic browser detection with custom paths
                </p>
                
                {BROWSERS.map((browser) => (
                  <div key={browser.id} className="space-y-2">
                    <Label>{browser.name} Path</Label>
                    <Input
                      placeholder={`Auto-detected`}
                      value={formData.browserPaths[browser.id] || ''}
                      onChange={(e) => {
                        const newPaths = { ...formData.browserPaths };
                        if (e.target.value) {
                          newPaths[browser.id] = e.target.value;
                        } else {
                          delete newPaths[browser.id];
                        }
                        handleChange('browserPaths', newPaths);
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan" className="space-y-6">
          <ScanPathsSettings formData={formData} onChange={handleChange} />

          <Card>
            <CardHeader>
              <CardTitle>Workspace Paths</CardTitle>
              <CardDescription>
                Additional pnpm workspace roots to include
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Workspaces</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const newPaths = [...formData.workspace.paths, ''];
                    handleChange('workspace.paths', newPaths);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Workspace
                </Button>
              </div>
              
              <div className="space-y-2">
                {formData.workspace.paths.map((path: string, index: number) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={path}
                      onChange={(e) => {
                        const newPaths = [...formData.workspace.paths];
                        newPaths[index] = e.target.value;
                        handleChange('workspace.paths', newPaths);
                      }}
                      placeholder="/path/to/workspace"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newPaths = formData.workspace.paths.filter((_: any, i: number) => i !== index);
                        handleChange('workspace.paths', newPaths);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Server Configuration</CardTitle>
              <CardDescription>
                Hub server network settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Server Port</Label>
                  <Input
                    type="number"
                    value={formData.serverPort}
                    onChange={(e) => handleChange('serverPort', parseInt(e.target.value))}
                    min={1024}
                    max={65535}
                  />
                  <p className="text-sm text-muted-foreground">
                    Port for the Hub dashboard server
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Server Host</Label>
                  <Input
                    value={formData.serverHost}
                    onChange={(e) => handleChange('serverHost', e.target.value)}
                    placeholder="127.0.0.1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Host address to bind the server
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted">
                <p className="text-sm font-medium">Server URL</p>
                <p className="text-sm text-muted-foreground">
                  http://{formData.serverHost}:{formData.serverPort}
                </p>
              </div>

              <div className="space-y-2">
                <Label>CLI Output Mode</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={formData.cliOutput}
                  onChange={(e) => handleChange('cliOutput', e.target.value)}
                >
                  <option value="pretty">Pretty (formatted)</option>
                  <option value="json">JSON</option>
                  <option value="silent">Silent</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Scan Paths Settings Component
function ScanPathsSettings({ formData, onChange }: { formData: any; onChange: (path: string, value: any) => void }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanningPath, setScanningPath] = useState<string | null>(null);

  // Add scan path mutation
  const addScanPath = useMutation({
    mutationFn: async (path: string) => {
      const response = await api.post('/api/settings/scan-paths', { path });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  // Remove scan path mutation
  const removeScanPath = useMutation({
    mutationFn: async (path: string) => {
      const response = await api.delete('/api/settings/scan-paths', { data: { path } });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  // Scan path mutation
  const scanPath = useMutation({
    mutationFn: async (path?: string) => {
      setScanningPath(path || 'all');
      const response = await api.post('/api/settings/scan-paths/scan', path ? { path } : {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setScanningPath(null);
      // Show success toast or notification
      alert(`Scan complete! Found ${data.found} projects.`);
    },
    onError: () => {
      setScanningPath(null);
    },
  });

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fullPath = file.path || file.webkitRelativePath?.split('/')[0];
      if (fullPath) {
        addScanPath.mutate(fullPath);
      }
    }
  };

  const handleAddPath = () => {
    const newPaths = [...formData.scan.paths, ''];
    onChange('scan.paths', newPaths);
  };

  const handlePathChange = (index: number, value: string) => {
    const newPaths = [...formData.scan.paths];
    newPaths[index] = value;
    onChange('scan.paths', newPaths);
  };

  const handleRemovePath = (index: number) => {
    const path = formData.scan.paths[index];
    const newPaths = formData.scan.paths.filter((_: any, i: number) => i !== index);
    onChange('scan.paths', newPaths);
    
    // Also remove from server if it exists
    if (path) {
      removeScanPath.mutate(path);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Scan Configuration</CardTitle>
          <CardDescription>
            Directories to automatically scan for extension projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Scan Paths</Label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  webkitdirectory=""
                  directory=""
                  onChange={handleFolderSelect}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={addScanPath.isPending}
                >
                  {addScanPath.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FolderOpen className="mr-2 h-4 w-4" />
                  )}
                  Browse
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddPath}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Path
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {formData.scan.paths.map((path: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={path}
                    onChange={(e) => handlePathChange(index, e.target.value)}
                    placeholder="/path/to/projects"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scanPath.mutate(path)}
                    disabled={!path || scanPath.isPending}
                    title="Scan this path"
                  >
                    {scanningPath === path ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePath(index)}
                    disabled={removeScanPath.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {formData.scan.paths.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No scan paths configured. Add a path to start scanning for projects.
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Quick Scan</Label>
              <p className="text-sm text-muted-foreground">
                Scan all configured paths for new projects
              </p>
            </div>
            <Button 
              variant="secondary"
              onClick={() => scanPath.mutate(undefined)}
              disabled={scanPath.isPending || formData.scan.paths.length === 0}
            >
              {scanPath.isPending && scanningPath === 'all' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Scan All
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Max Scan Depth</Label>
            <Input
              type="number"
              value={formData.scan.maxDepth}
              onChange={(e) => onChange('scan.maxDepth', parseInt(e.target.value))}
              min={1}
              max={10}
            />
            <p className="text-sm text-muted-foreground">
              How deep to scan directory trees (1-10 levels)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Scan</Label>
              <p className="text-sm text-muted-foreground">
                Automatically scan on startup
              </p>
            </div>
            <Switch
              checked={formData.scan.enabled}
              onCheckedChange={(v) => onChange('scan.enabled', v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Projects</CardTitle>
          <CardDescription>
            Projects added manually are preserved even if not found in scan paths
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Manually added project paths
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            {formData.manualProjects?.length > 0 ? (
              formData.manualProjects.map((path: string, index: number) => (
                <div key={index} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm truncate flex-1" title={path}>
                    {path}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const newPaths = formData.manualProjects.filter((_: any, i: number) => i !== index);
                      onChange('manualProjects', newPaths);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No manual projects configured. Use the "Add Project" button to add one.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

