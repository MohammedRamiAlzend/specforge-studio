import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../widgets/layout/AppShell";
import { PublicShell } from "../widgets/layout/PublicShell";
import { GuestOnly, HomeGate } from "./guards";
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
import { AuthPage } from "../pages/auth/AuthPage";
import { CheckoutPage } from "../pages/billing/CheckoutPage";

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
          {/* Prompt 21: `/` is the public landing for guests and the
              dashboard for signed-in users — internal paths unchanged. */}
          <Route index element={<HomeGate />} />

          <Route element={<AppShell />}>
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
          </Route>

          {/* Prompt 21: public marketing routes (guests only where relevant). */}
          <Route element={<PublicShell />}>
            <Route
              path="signin"
              element={
                <GuestOnly>
                  <AuthPage mode="signin" />
                </GuestOnly>
              }
            />
            <Route
              path="register"
              element={
                <GuestOnly>
                  <AuthPage mode="register" />
                </GuestOnly>
              }
            />
            <Route path="checkout/:planKey" element={<CheckoutPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
