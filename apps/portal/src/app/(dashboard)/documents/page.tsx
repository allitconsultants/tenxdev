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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  FileText,
  Download,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Users,
  Calendar,
} from 'lucide-react';
import { getDocuments, getDocumentSignatures, type Document, type Signature } from '@/lib/api/documents';
import { UploadDialog } from '@/components/documents/upload-dialog';

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'secondary',
  sent: 'default',
  viewed: 'warning',
  signed: 'success',
  declined: 'destructive',
  expired: 'secondary',
  draft: 'secondary',
  in_progress: 'warning',
  completed: 'success',
  voided: 'destructive',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  viewed: <Eye className="h-4 w-4" />,
  signed: <CheckCircle2 className="h-4 w-4" />,
  declined: <XCircle className="h-4 w-4" />,
  expired: <Clock className="h-4 w-4" />,
};

const documentTypeColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  contract: 'default',
  proposal: 'secondary',
  invoice: 'warning',
  receipt: 'success',
  sow: 'default',
  nda: 'destructive',
  other: 'secondary',
};

interface DocumentWithSignatures extends Document {
  signatures: Signature[];
}

function getSignatureStatus(signatures: Signature[]): {
  label: string;
  variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
} {
  if (signatures.length === 0) {
    return { label: 'No signatures', variant: 'secondary' };
  }

  const allSigned = signatures.every((s) => s.status === 'signed');
  if (allSigned) {
    return { label: 'Completed', variant: 'success' };
  }

  const anyDeclined = signatures.some((s) => s.status === 'declined');
  if (anyDeclined) {
    return { label: 'Declined', variant: 'destructive' };
  }

  const pendingCount = signatures.filter((s) => s.status !== 'signed').length;
  return { label: `${pendingCount} pending`, variant: 'warning' };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

async function fetchDocumentsWithSignatures(): Promise<DocumentWithSignatures[]> {
  try {
    const docsResponse = await getDocuments();
    const documents = docsResponse.data || [];

    // Fetch signatures for each document
    const documentsWithSignatures = await Promise.all(
      documents.map(async (doc) => {
        try {
          const sigsResponse = await getDocumentSignatures(doc.id);
          return { ...doc, signatures: sigsResponse.data || [] };
        } catch {
          return { ...doc, signatures: [] };
        }
      })
    );

    return documentsWithSignatures;
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return [];
  }
}

export default async function DocumentsPage() {
  const documents = await fetchDocumentsWithSignatures();

  // Filter documents by signature status
  const pendingDocuments = documents.filter((doc) => {
    if (doc.signatures.length === 0) return false;
    return doc.signatures.some((s) => s.status !== 'signed' && s.status !== 'declined');
  });

  const completedDocuments = documents.filter((doc) => {
    if (doc.signatures.length === 0) return false;
    return doc.signatures.every((s) => s.status === 'signed');
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Manage documents and track e-signatures
          </p>
        </div>
        <UploadDialog />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Signatures ({pendingDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedDocuments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DocumentList documents={documents} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Send className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">No pending signatures</p>
                <p className="text-sm text-muted-foreground">
                  Documents waiting for signatures will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <DocumentList documents={pendingDocuments} />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">No completed documents</p>
                <p className="text-sm text-muted-foreground">
                  Fully signed documents will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <DocumentList documents={completedDocuments} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DocumentList({ documents }: { documents: DocumentWithSignatures[] }) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No documents</p>
          <p className="text-sm text-muted-foreground">
            Upload documents to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const signatureStatus = getSignatureStatus(doc.signatures);
        const signedCount = doc.signatures.filter((s) => s.status === 'signed').length;

        return (
          <Card key={doc.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-xl">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="hover:underline"
                    >
                      {doc.name}
                    </Link>
                  </CardTitle>
                  <Badge
                    variant={documentTypeColors[doc.type] || 'secondary'}
                    className="capitalize"
                  >
                    {doc.type}
                  </Badge>
                  {doc.signatures.length > 0 && (
                    <Badge variant={signatureStatus.variant}>
                      {signatureStatus.label}
                    </Badge>
                  )}
                </div>
                {doc.description && (
                  <CardDescription>{doc.description}</CardDescription>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/documents/${doc.id}`}>View Details</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  {doc.signatures.length === 0 && (
                    <DropdownMenuItem asChild>
                      <Link href={`/documents/${doc.id}/send`}>
                        <Send className="mr-2 h-4 w-4" />
                        Request Signatures
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Signature Progress */}
                {doc.signatures.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Signatures</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {signedCount} / {doc.signatures.length} signed
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {doc.signatures.map((sig) => (
                        <Badge
                          key={sig.id}
                          variant={statusColors[sig.status]}
                          className="text-xs"
                        >
                          {statusIcons[sig.status]}
                          <span className="ml-1">{sig.signerName || sig.signerEmail}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* File Info */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">File Info</p>
                  <p className="text-lg font-semibold">
                    {doc.mimeType?.split('/')[1]?.toUpperCase() || 'Unknown'}
                  </p>
                  {doc.fileSize && (
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(doc.fileSize)}
                    </p>
                  )}
                </div>

                {/* Upload Date */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Uploaded</span>
                  </div>
                  <p className="font-medium">{formatDate(doc.createdAt)}</p>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/documents/${doc.id}`}>
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Link>
                    </Button>
                    {doc.signatures.length === 0 && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/documents/${doc.id}/send`}>
                          <Send className="mr-1 h-3 w-3" />
                          Send
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
