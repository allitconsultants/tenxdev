import { auth } from '@/lib/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  FolderKanban,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { getProjects, getProjectActivity } from '@/lib/api/projects';
import { getInvoices } from '@/lib/api/billing';
import type { Project, ActivityLog } from '@/lib/api/projects';
import type { Invoice } from '@/lib/api/billing';

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function calculateStats(projects: Project[], invoices: Invoice[]) {
  const activeProjects = projects.filter(
    (p) => !['completed', 'cancelled'].includes(p.status)
  ).length;

  const totalInvoiced = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.total || '0'),
    0
  );

  // Estimate hours saved based on project tiers
  const hoursSaved = projects.reduce((sum, p) => {
    if (p.tier === 'tier1') return sum + 160;
    if (p.tier === 'tier2') return sum + 320;
    if (p.tier === 'tier3') return sum + 640;
    return sum;
  }, 0);

  return [
    {
      name: 'Active Projects',
      value: activeProjects.toString(),
      change: `${projects.length} total`,
      icon: FolderKanban,
    },
    {
      name: 'Total Invoiced',
      value: formatCurrency(totalInvoiced),
      change: `${invoices.filter((i) => i.status === 'paid').length} paid`,
      icon: DollarSign,
    },
    {
      name: 'Hours Saved',
      value: hoursSaved.toString(),
      change: 'vs traditional dev',
      icon: Clock,
    },
    {
      name: 'ROI',
      value: '10x',
      change: 'development speed',
      icon: TrendingUp,
    },
  ];
}

function getPendingActions(projects: Project[], invoices: Invoice[]) {
  const actions: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    action: string;
    href: string;
  }> = [];

  // Check for unpaid invoices
  const unpaidInvoices = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue');
  for (const inv of unpaidInvoices.slice(0, 2)) {
    actions.push({
      id: `inv-${inv.id}`,
      type: 'payment',
      title: inv.status === 'overdue' ? 'Invoice Overdue' : 'Invoice Due',
      description: `Invoice ${inv.number || inv.id.slice(0, 8)} - ${formatCurrency(inv.total)}`,
      action: 'Pay Now',
      href: '/billing',
    });
  }

  return actions;
}

export default async function DashboardPage() {
  const session = await auth();

  // Fetch data from services
  const [projectsResponse, invoicesResponse] = await Promise.all([
    getProjects(),
    getInvoices(),
  ]);

  const projects = projectsResponse.data || [];
  const invoices = invoicesResponse.data || [];

  // Get activity for the first few projects
  const activeProjects = projects
    .filter((p) => !['completed', 'cancelled'].includes(p.status))
    .slice(0, 5);

  let recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    project: string;
    time: string;
  }> = [];

  // Fetch activity for the first project if available
  if (activeProjects.length > 0) {
    const activityResponse = await getProjectActivity(activeProjects[0].id, 5);
    if (activityResponse.data) {
      recentActivity = activityResponse.data.map((log) => ({
        id: log.id,
        type: log.action.includes('status') ? 'update' : 'milestone',
        message: log.description || log.action,
        project: activeProjects[0].name,
        time: formatTimeAgo(log.createdAt),
      }));
    }
  }

  // Calculate dashboard data
  const stats = calculateStats(projects, invoices);
  const pendingActions = getPendingActions(projects, invoices);

  // Transform projects for display
  const displayProjects = activeProjects.map((project) => ({
    id: project.id,
    name: project.name,
    tier: project.tier,
    status: project.status,
    progress: project.progress,
    nextMilestone: project.status === 'production' ? 'Ongoing Support' : 'Next milestone',
    dueDate: project.estimatedEndDate,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your projects.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Projects */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Projects</CardTitle>
                <CardDescription>Your current development projects</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/projects">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {displayProjects.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FolderKanban className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2">No active projects yet</p>
                  <Button className="mt-4" asChild>
                    <Link href="/projects/new">Start a Project</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-medium hover:underline"
                          >
                            {project.name}
                          </Link>
                          <Badge variant="secondary" className="capitalize">
                            {project.tier.replace('tier', 'Tier ')}
                          </Badge>
                          <Badge
                            variant={
                              project.status === 'production'
                                ? 'success'
                                : project.status === 'testing'
                                ? 'warning'
                                : 'default'
                            }
                            className="capitalize"
                          >
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Next: {project.nextMilestone}
                          {project.dueDate && ` • Due ${new Date(project.dueDate).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="w-32">
                        <div className="flex items-center justify-between text-sm">
                          <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pending Actions */}
          {pendingActions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Pending Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingActions.map((action) => (
                    <div
                      key={action.id}
                      className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950"
                    >
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                      <Button size="sm" className="mt-2" asChild>
                        <Link href={action.href}>{action.action}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.project} • {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
