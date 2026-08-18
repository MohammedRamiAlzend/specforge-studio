import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../widgets/layout/AppShell";
import { DashboardPage } from "../pages/DashboardPage";
import { ProjectDetailsPage } from "../pages/ProjectDetailsPage";
import { ModelerPage } from "../pages/modeler/ModelerPage";
import { CanvasPage } from "../pages/modeler/CanvasPage";
import { WorkflowsPage } from "../pages/WorkflowsPage";
import { DataModelPage } from "../pages/DataModelPage";
import { ArchitecturePage } from "../pages/ArchitecturePage";
import { DiagramsPage } from "../pages/diagrams/DiagramsPage";
import { RoadmapPage } from "../pages/roadmap/RoadmapPage";
import { GovernancePage } from "../pages/governance/GovernancePage";
import { DocsExportPage } from "../pages/DocsExportPage";
import { TasksPage } from "../pages/TasksPage";
import { SkillsPage } from "../pages/SkillsPage";
import { IssuesPage } from "../pages/IssuesPage";
import { ReleasesPage } from "../pages/ReleasesPage";
import { SettingsPage } from "../pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
            <Route path="projects/:projectId/modeler" element={<ModelerPage />} />
            <Route path="projects/:projectId/modeler/:graphId" element={<CanvasPage />} />
            <Route path="projects/:projectId/workflows" element={<WorkflowsPage />} />
            <Route path="projects/:projectId/data-model" element={<DataModelPage />} />
            <Route path="projects/:projectId/architecture" element={<ArchitecturePage />} />
            <Route path="projects/:projectId/diagrams" element={<DiagramsPage />} />
            <Route path="projects/:projectId/roadmap" element={<RoadmapPage />} />
            <Route path="projects/:projectId/governance" element={<GovernancePage />} />
            <Route path="projects/:projectId/docs" element={<DocsExportPage />} />
            <Route path="projects/:projectId/tasks" element={<TasksPage />} />
            <Route path="projects/:projectId/issues" element={<IssuesPage />} />
            <Route path="projects/:projectId/releases" element={<ReleasesPage />} />
            <Route path="projects/:projectId/skills" element={<SkillsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
