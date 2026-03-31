import { useState } from 'react';
import { useProjects, useScan, useDeleteProject, useCreateSession } from '@/hooks/use-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FolderKanban, 
  Search, 
  RefreshCw, 
  Play, 
  Trash2,
  Plus,
  FolderOpen,
  Github
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Project } from '@/hooks/use-api';

const TOOL_ICONS: Record<string, string> = {
  addfox: '🔥',
  wxt: '⚡',
  plasmo: '🚀',
  vanilla: '📦',
};

function ProjectCard({ project }: { project: Project }) {
  const deleteProject = useDeleteProject();
  const createSession = useCreateSession();

  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>{TOOL_ICONS[project.tool] || '📦'}</span>
              {project.name}
            </CardTitle>
            <CardDescription className="line-clamp-1">
              {project.manifest?.description || 'No description'}
            </CardDescription>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => createSession.mutate({ projectId: project.id })}
              disabled={createSession.isPending}
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => deleteProject.mutate(project.id)}
              disabled={deleteProject.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{project.tool}</Badge>
            {project.workspace && (
              <Badge variant="secondary">{project.workspace.name}</Badge>
            )}
            {project.lastDevAt && (
              <Badge className="bg-green-500">Active</Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground truncate">
            {project.path}
          </p>

          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1" asChild>
              <Link to={`/projects/${project.id}`}>Details</Link>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => createSession.mutate({ projectId: project.id })}
              disabled={createSession.isPending}
            >
              <Play className="mr-1 h-3 w-3" />
              Dev
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Projects() {
  const { data: projects, isLoading } = useProjects();
  const scan = useScan();
  const [filter, setFilter] = useState<string>('all');

  const filteredProjects = projects?.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'active') return p.lastDevAt;
    if (filter === 'workspace') return p.workspace;
    return p.tool === filter;
  }) || [];

  const tools = [...new Set(projects?.map(p => p.tool) || [])];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your browser extension projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => scan.mutate()}
            disabled={scan.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${scan.isPending ? 'animate-spin' : ''}`} />
            Scan
          </Button>
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="workspace">Workspaces</TabsTrigger>
          {tools.map(tool => (
            <TabsTrigger key={tool} value={tool}>
              {tool}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
                <p className="text-sm text-muted-foreground">
                  {filter === 'all' 
                    ? 'Scan your directories to discover extension projects'
                    : 'No projects match the current filter'}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={() => scan.mutate()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Scan Now
                  </Button>
                  <Button asChild>
                    <Link to="/projects/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Manually
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
