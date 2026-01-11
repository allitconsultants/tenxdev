import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ExternalLink,
  Github,
  Calendar,
  DollarSign,
  CheckCircle2,
  Circle,
  Clock,
  Cloud,
  BarChart3,
} from 'lucide-react';
import { getProject, getProjectActivity } from '@/lib/api/projects';
import { ApiError } from '@/lib/api/client';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
}

function getMilestoneIcon(status: string) {
  switch (status) {
    case 'completed':
    case 'approved':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-blue-500" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  try {
    // Fetch project and activity in parallel
    const [projectResponse, activityResponse] = await Promise.all([
      getProject(id),
      getProjectActivity(id, 10),
    ]);

    if (!projectResponse.success || !projectResponse.data) {
      notFound();
    }

    const project = projectResponse.data;
    const milestones = project.milestones || [];
    const activityLog = activityResponse.data || [];

    const completedMilestones = milestones.filter(
      (m) => m.status === 'completed' || m.status === 'approved'
    ).length;
    const overallProgress = milestones.length > 0
      ? (completedMilestones / milestones.length) * 100
      : project.progress;

    const totalAmount = parseFloat(project.totalAmount || '0');
    const amountPaid = parseFloat(project.amountPaid || '0');

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>

        {/* Project Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant="secondary" className="capitalize">
                {project.tier.replace('tier', 'Tier ')}
              </Badge>
              <Badge className="capitalize">{project.status}</Badge>
              {project.cloudProvider && (
                <Badge variant="outline" className="uppercase">
                  {project.cloudProvider}
                </Badge>
              )}
            </div>
            <p className="max-w-2xl text-muted-foreground">{project.description}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
              <Progress value={overallProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(amountPaid)}
              </div>
              <p className="text-xs text-muted-foreground">
                of {formatCurrency(totalAmount)} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Milestones</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {completedMilestones} / {milestones.length}
              </div>
              <p className="text-xs text-muted-foreground">completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Target Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {project.estimatedEndDate
                  ? formatDate(project.estimatedEndDate)
                  : 'TBD'}
              </div>
              <p className="text-xs text-muted-foreground">estimated completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="milestones" className="space-y-4">
          <TabsList>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="environments">Environments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="milestones" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Milestones</CardTitle>
                <CardDescription>
                  Track progress and payments for each milestone
                </CardDescription>
              </CardHeader>
              <CardContent>
                {milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No milestones defined yet
                  </p>
                ) : (
                  <div className="space-y-6">
                    {milestones.map((milestone, index) => {
                      const paymentAmount = parseFloat(milestone.paymentAmount || '0');
                      const deliverables = Array.isArray(milestone.deliverables)
                        ? milestone.deliverables
                        : [];

                      return (
                        <div key={milestone.id}>
                          <div className="flex items-start gap-4">
                            <div className="mt-1">{getMilestoneIcon(milestone.status)}</div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{milestone.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {milestone.description}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">
                                    {formatCurrency(paymentAmount)}
                                  </p>
                                  <Badge
                                    variant={
                                      milestone.paymentStatus === 'paid'
                                        ? 'success'
                                        : milestone.paymentStatus === 'invoiced'
                                        ? 'warning'
                                        : 'secondary'
                                    }
                                    className="capitalize"
                                  >
                                    {milestone.paymentStatus}
                                  </Badge>
                                </div>
                              </div>

                              {deliverables.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {deliverables.map((deliverable, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {deliverable}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {milestone.dueDate && (
                                <p className="text-sm text-muted-foreground">
                                  Due: {formatDate(milestone.dueDate)}
                                </p>
                              )}
                              {milestone.completedAt && (
                                <p className="text-sm text-green-600">
                                  Completed: {formatDate(milestone.completedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                          {index < milestones.length - 1 && (
                            <Separator className="my-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="environments" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Staging Environment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.stagingUrl ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Active</Badge>
                      </div>
                      <Button variant="outline" asChild>
                        <a
                          href={project.stagingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Staging Site
                        </a>
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Staging environment not yet deployed
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Production Environment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.productionUrl ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Active</Badge>
                      </div>
                      <Button variant="outline" asChild>
                        <a
                          href={project.productionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Production Site
                        </a>
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Production environment not yet deployed
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="h-5 w-5" />
                    Repositories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.githubAppRepoUrl && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a
                        href={project.githubAppRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="mr-2 h-4 w-4" />
                        Application Repository
                      </a>
                    </Button>
                  )}
                  {project.githubInfraRepoUrl && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a
                        href={project.githubInfraRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="mr-2 h-4 w-4" />
                        Infrastructure Repository
                      </a>
                    </Button>
                  )}
                  {!project.githubAppRepoUrl && !project.githubInfraRepoUrl && (
                    <p className="text-sm text-muted-foreground">
                      No repositories linked yet
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Monitoring
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.grafanaUrl ? (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a
                        href={project.grafanaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Grafana Dashboard
                      </a>
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Monitoring not yet configured
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Recent activity on this project</CardDescription>
              </CardHeader>
              <CardContent>
                {activityLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No activity recorded yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activityLog.map((activity) => (
                      <div key={activity.id} className="flex gap-4">
                        <div className="mt-1">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <div>
                          <p className="text-sm">{activity.description || activity.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    throw error;
  }
}
