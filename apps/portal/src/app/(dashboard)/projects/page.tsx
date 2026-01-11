import { auth } from '@/lib/auth';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  ExternalLink,
  Github,
  BarChart3,
  Calendar,
  FolderKanban,
} from 'lucide-react';
import { getProjects } from '@/lib/api/projects';

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  discovery: 'default',
  development: 'default',
  testing: 'warning',
  staging: 'warning',
  production: 'success',
  transfer: 'warning',
  completed: 'success',
  cancelled: 'destructive',
};

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
}

export default async function ProjectsPage() {
  const session = await auth();

  // Fetch projects from API
  const response = await getProjects();
  const projects = response.data || [];

  const activeProjects = projects.filter(
    (p) => !['completed', 'cancelled'].includes(p.status)
  );
  const completedProjects = projects.filter((p) => p.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track all your development projects
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeProjects.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">No active projects</p>
                <p className="text-sm text-muted-foreground">
                  Your active projects will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            activeProjects.map((project) => {
              const totalAmount = parseFloat(project.totalAmount || '0');
              const amountPaid = parseFloat(project.amountPaid || '0');
              const paymentProgress = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;

              return (
                <Card key={project.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">
                          <Link
                            href={`/projects/${project.id}`}
                            className="hover:underline"
                          >
                            {project.name}
                          </Link>
                        </CardTitle>
                        <Badge variant="secondary" className="capitalize">
                          {project.tier.replace('tier', 'Tier ')}
                        </Badge>
                        <Badge
                          variant={statusColors[project.status]}
                          className="capitalize"
                        >
                          {project.status}
                        </Badge>
                        {project.cloudProvider && (
                          <Badge variant="outline" className="uppercase">
                            {project.cloudProvider}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{project.description}</CardDescription>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/projects/${project.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/projects/${project.id}/documents`}>
                            Documents
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/projects/${project.id}/environments`}>
                            Environments
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>

                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Overall Progress
                          </span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} />
                        <p className="text-xs text-muted-foreground">
                          Status: {project.status}
                        </p>
                      </div>

                      {/* Payment Status */}
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Payment Status
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(amountPaid)} /{' '}
                          {formatCurrency(totalAmount)}
                        </p>
                        <Progress
                          value={paymentProgress}
                          className="h-1"
                        />
                      </div>

                      {/* Quick Links */}
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Quick Links</p>
                        <div className="flex flex-wrap gap-2">
                          {project.stagingUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={project.stagingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-1 h-3 w-3" />
                                Staging
                              </a>
                            </Button>
                          )}
                          {project.productionUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={project.productionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-1 h-3 w-3" />
                                Production
                              </a>
                            </Button>
                          )}
                          {project.githubAppRepoUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={project.githubAppRepoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Github className="mr-1 h-3 w-3" />
                                GitHub
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Next Due Date */}
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Estimated End Date
                        </p>
                        {project.estimatedEndDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {new Date(project.estimatedEndDate).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No end date set
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">No completed projects yet</p>
                <p className="text-sm text-muted-foreground">
                  Your completed projects will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            completedProjects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>
                      <Link href={`/projects/${project.id}`} className="hover:underline">
                        {project.name}
                      </Link>
                    </CardTitle>
                    <Badge variant="success">Completed</Badge>
                  </div>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
