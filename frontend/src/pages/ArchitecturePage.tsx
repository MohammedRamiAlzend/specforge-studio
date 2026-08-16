import { Link, useParams } from "react-router-dom";
import { Button } from "../shared/ui/Button";
import { PageHeader } from "../shared/ui/PageHeader";
import { EmptyState } from "../shared/ui/States";

export function ArchitecturePage() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Architecture"
        description="Components, layers, and system boundaries."
        actions={
          <Link to={`/projects/${projectId}/modeler?kind=architecture`}>
            <Button size="sm">Visual modeler</Button>
          </Link>
        }
      />
      <EmptyState
        title="Model your architecture visually"
        hint="Use the visual modeler to place screens, API calls, databases, external systems, and AI agents on a canvas. Generated architecture diagrams (context, container, component) follow automatically from the saved graph."
        actionLabel="Open visual modeler"
        onAction={() => {
          window.location.href = `/projects/${projectId}/modeler?kind=architecture`;
        }}
      />
    </div>
  );
}
