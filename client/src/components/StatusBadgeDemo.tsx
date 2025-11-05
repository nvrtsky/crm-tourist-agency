import { Badge } from "@/components/ui/badge";

export function StatusBadgeDemo() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Status Badge Variants (Light/Dark Mode)</h3>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default" data-testid="badge-default">Default (Gold)</Badge>
          <Badge variant="secondary" data-testid="badge-secondary">Secondary</Badge>
          <Badge variant="success" data-testid="badge-success">Success (Won)</Badge>
          <Badge variant="warning" data-testid="badge-warning">Warning (In Progress)</Badge>
          <Badge variant="info" data-testid="badge-info">Info (New)</Badge>
          <Badge variant="destructive" data-testid="badge-destructive">Destructive (Lost)</Badge>
          <Badge variant="outline" data-testid="badge-outline">Outline</Badge>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">CRM Lead Statuses</h3>
        <div className="flex flex-wrap gap-3">
          <Badge variant="info">New Lead</Badge>
          <Badge variant="warning">Contacted</Badge>
          <Badge variant="warning">Qualified</Badge>
          <Badge variant="success">Converted</Badge>
          <Badge variant="destructive">Lost</Badge>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Deal Statuses</h3>
        <div className="flex flex-wrap gap-3">
          <Badge variant="info">New</Badge>
          <Badge variant="warning">Negotiation</Badge>
          <Badge variant="warning">Payment Pending</Badge>
          <Badge variant="success">Confirmed</Badge>
          <Badge variant="destructive">Cancelled</Badge>
        </div>
      </div>

      <div className="mt-8 p-4 bg-card border border-card-border rounded-md">
        <h4 className="font-medium mb-2">Color Test on Card Background</h4>
        <div className="flex flex-wrap gap-3">
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </div>
    </div>
  );
}
