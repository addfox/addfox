import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/hooks/use-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  FolderOpen, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileJson,
  Code2,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectDetectionResult {
  detected: boolean;
  name?: string;
  tool?: string;
  manifest?: {
    name: string;
    version: string;
    manifest_version: number;
    description?: string;
  };
  hasDevScript?: boolean;
  devCommand?: string;
  error?: string;
}

const TOOL_CONFIG: Record<string, { name: string; icon: string; color: string }> = {
  addfox: { name: 'Addfox', icon: '🔥', color: 'bg-orange-500' },
  wxt: { name: 'WXT', icon: '⚡', color: 'bg-yellow-500' },
  plasmo: { name: 'Plasmo', icon: '🚀', color: 'bg-purple-500' },
  vanilla: { name: 'Vanilla', icon: '📦', color: 'bg-blue-500' },
  generic: { name: 'Generic', icon: '🔧', color: 'bg-gray-500' },
};

export function AddProject() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [path, setPath] = useState('');
  const [customName, setCustomName] = useState('');
  const [tags, setTags] = useState('');
  const [detectionResult, setDetectionResult] = useState<ProjectDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Detect project at path
  const detectProject = useCallback(async (projectPath: string) => {
    if (!projectPath.trim()) {
      setDetectionResult(null);
      return;
    }

    setIsDetecting(true);
    try {
      const response = await api.post('/api/scan', { path: projectPath });
      const result = response.data;
      
      if (result.projects && result.projects.length > 0) {
        const project = result.projects[0];
        setDetectionResult({
          detected: true,
          name: project.name,
          tool: project.tool,
          manifest: project.manifest,
          hasDevScript: !!project.packageJson?.scripts?.dev,
          devCommand: project.packageJson?.scripts?.dev,
        });
        if (!customName) {
          setCustomName(project.name);
        }
      } else {
        setDetectionResult({
          detected: false,
          error: 'No extension project found at this path. Make sure it has a manifest.json file.',
        });
      }
    } catch (error: any) {
      setDetectionResult({
        detected: false,
        error: error.response?.data?.error || 'Failed to detect project',
      });
    } finally {
      setIsDetecting(false);
    }
  }, [customName]);

  // Handle path input change with debounce
  const handlePathChange = (value: string) => {
    setPath(value);
    // Debounce detection
    const timeoutId = setTimeout(() => {
      if (value.trim()) {
        detectProject(value);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  // Handle folder selection
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Get the directory path from the first file
      const file = files[0];
      const dirPath = file.webkitRelativePath 
        ? file.webkitRelativePath.split('/')[0]
        : file.path || file.name;
      
      // Construct full path - in real browser this may not work due to security
      // This is a best-effort approach
      const fullPath = file.path || dirPath;
      setPath(fullPath);
      detectProject(fullPath);
    }
  };

  // Add project mutation
  const addProject = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/projects', {
        path,
        name: customName || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (detectionResult?.detected) {
      addProject.mutate();
    }
  };

  const toolConfig = detectionResult?.tool ? TOOL_CONFIG[detectionResult.tool] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Project</h1>
          <p className="text-muted-foreground">
            Add a browser extension project manually
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Path Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Project Location
            </CardTitle>
            <CardDescription>
              Select the directory containing your extension project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="/path/to/your/extension"
                value={path}
                onChange={(e) => handlePathChange(e.target.value)}
                className="flex-1"
              />
              <input
                ref={fileInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                onChange={handleFolderSelect}
                className="hidden"
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </div>
            
            {isDetecting && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Detecting project...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detection Result */}
        {detectionResult && (
          <Card className={cn(
            detectionResult.detected ? "border-green-500/50" : "border-destructive/50"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {detectionResult.detected ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Project Detected
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Detection Failed
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detectionResult.detected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {toolConfig && (
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center text-2xl",
                        toolConfig.color
                      )}>
                        {toolConfig.icon}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-lg">{detectionResult.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{detectionResult.tool}</Badge>
                        {detectionResult.hasDevScript && (
                          <Badge className="bg-green-500">Has dev script</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {detectionResult.manifest && (
                    <div className="rounded-lg bg-muted p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileJson className="h-4 w-4" />
                        manifest.json
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name:</span>{' '}
                          {detectionResult.manifest.name}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Version:</span>{' '}
                          {detectionResult.manifest.version}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Manifest Version:</span>{' '}
                          {detectionResult.manifest.manifest_version}
                        </div>
                      </div>
                      {detectionResult.manifest.description && (
                        <p className="text-sm text-muted-foreground">
                          {detectionResult.manifest.description}
                        </p>
                      )}
                    </div>
                  )}

                  {detectionResult.devCommand && (
                    <div className="flex items-center gap-2 text-sm">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Dev command:</span>
                      <code className="bg-muted px-2 py-0.5 rounded">{detectionResult.devCommand}</code>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{detectionResult.error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Project Details
            </CardTitle>
            <CardDescription>
              Customize how the project appears in Hub
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name (optional)</Label>
              <Input
                id="name"
                placeholder={detectionResult?.name || "My Extension"}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to use the name from manifest.json
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (optional)</Label>
              <Input
                id="tags"
                placeholder="react, typescript, productivity"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Comma-separated tags to organize your projects
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button variant="outline" type="button" asChild>
            <Link to="/projects">Cancel</Link>
          </Button>
          <Button 
            type="submit"
            disabled={!detectionResult?.detected || addProject.isPending}
          >
            {addProject.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
