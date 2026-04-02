import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Projects } from '@/pages/Projects';
import { Sessions } from '@/pages/Sessions';
import { Settings } from '@/pages/Settings';
import { ProjectDetail } from '@/pages/ProjectDetail';
import { Logs } from '@/pages/Logs';
import { Terminal } from '@/pages/Terminal';
import { AddProject } from '@/pages/AddProject';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { TerminalDrawerProvider } from '@/components/TerminalDrawer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TerminalDrawerProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<AddProject />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/:id" element={<Sessions />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/terminal" element={<Terminal />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </BrowserRouter>
        <Toaster />
        </TerminalDrawerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
