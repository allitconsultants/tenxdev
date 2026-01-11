'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  FileText,
  Download,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Users,
  Bell,
  RefreshCw,
  Plus,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { ErrorState } from '@/components/error-state';
import {
  type Document,
  type SignatureEnvelope,
  type Signature,
} from '@/lib/api/documents';

const DOCUMENTS_SERVICE_URL = process.env.NEXT_PUBLIC_DOCUMENTS_SERVICE_URL || 'http://localhost:3005';

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

interface EnvelopeWithSignatures {
  envelope: SignatureEnvelope;
  document: Document;
  signatures: Signature[];
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [envelopes, setEnvelopes] = useState<SignatureEnvelope[]>([]);
  const [selectedEnvelope, setSelectedEnvelope] = useState<EnvelopeWithSignatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New envelope form state
  const [showNewEnvelope, setShowNewEnvelope] = useState(false);
  const [signers, setSigners] = useState<Array<{ email: string; name: string }>>([
    { email: '', name: '' },
  ]);
  const [signingOrder, setSigningOrder] = useState<'parallel' | 'sequential'>('parallel');
  const [emailMessage, setEmailMessage] = useState('');
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);

  // Fetch document and envelopes
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch document
        const docRes = await fetch(`${DOCUMENTS_SERVICE_URL}/api/v1/documents/${documentId}`);
        if (!docRes.ok) throw new Error('Document not found');
        const docData = await docRes.json();
        setDocument(docData.data);

        // Fetch document preview URL
        try {
          const previewRes = await fetch(
            `${DOCUMENTS_SERVICE_URL}/api/v1/documents/${documentId}/download`
          );
          if (previewRes.ok) {
            const previewData = await previewRes.json();
            setDocumentPreviewUrl(previewData.data?.downloadUrl || null);
          }
        } catch {
          // Preview URL fetch failed, will use storageUrl fallback
        }

        // Fetch envelopes
        const envRes = await fetch(
          `${DOCUMENTS_SERVICE_URL}/api/v1/envelopes/document/${documentId}`
        );
        if (envRes.ok) {
          const envData = await envRes.json();
          setEnvelopes(envData.data || []);

          // If there are envelopes, fetch the first one's details
          if (envData.data?.length > 0) {
            await fetchEnvelopeDetails(envData.data[0].id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [documentId]);

  const fetchEnvelopeDetails = async (envelopeId: string) => {
    try {
      const res = await fetch(`${DOCUMENTS_SERVICE_URL}/api/v1/envelopes/${envelopeId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEnvelope(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch envelope details:', err);
    }
  };

  const handleSendEnvelope = async (envelopeId: string) => {
    setActionLoading(`send-${envelopeId}`);
    try {
      const res = await fetch(`${DOCUMENTS_SERVICE_URL}/api/v1/envelopes/${envelopeId}/send`, {
        method: 'POST',
      });
      if (res.ok) {
        // Refresh envelope details
        await fetchEnvelopeDetails(envelopeId);
        // Refresh envelopes list
        const envRes = await fetch(
          `${DOCUMENTS_SERVICE_URL}/api/v1/envelopes/document/${documentId}`
        );
        if (envRes.ok) {
          const envData = await envRes.json();
          setEnvelopes(envData.data || []);
        }
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to send envelope');
      }
    } catch (err) {
      alert('Failed to send envelope');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReminders = async (envelopeId: string) => {
    setActionLoading(`remind-${envelopeId}`);
    try {
      const res = await fetch(`${DOCUMENTS_SERVICE_URL}/api/v1/envelopes/${envelopeId}/remind`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Reminders sent to ${data.data?.remindersSent || 0} signer(s)`);
      } else {
        alert(data.message || 'Failed to send reminders');
      }
    } catch (err) {
      alert('Failed to send reminders');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadSigned = async (envelopeId: string) => {
    setActionLoading(`download-${envelopeId}`);
    try {
      const res = await fetch(`${DOCUMENTS_SERVICE_URL}/api/v1/envelopes/${envelopeId}/download`);
      const data = await res.json();
      if (res.ok && data.data?.downloadUrl) {
        // Open download URL in new tab
        window.open(data.data.downloadUrl, '_blank');
      } else {
        alert(data.message || 'Failed to get download URL');
      }
    } catch (err) {
      alert('Failed to download signed document');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVoidEnvelope = async (envelopeId: string) => {
    if (!confirm('Are you sure you want to void this envelope? This cannot be undone.')) {
      return;
    }

    setActionLoading(`void-${envelopeId}`);
    try {
      const res = await fetch(`${DOCUMENTS_SERVICE_URL}/api/v1/envelopes/${envelopeId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Voided by sender' }),
      });
      if (res.ok) {
        // Refresh
        await fetchEnvelopeDetails(envelopeId);
        const envRes = await fetch(
          `${DOCUMENTS_SERVICE_URL}/api/v1/envelopes/document/${documentId}`
        );
        if (envRes.ok) {
          const envData = await envRes.json();
          setEnvelopes(envData.data || []);
        }
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to void envelope');
      }
    } catch (err) {
      alert('Failed to void envelope');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateEnvelope = async () => {
    // Validate signers
    const validSigners = signers.filter((s) => s.email && s.name);
    if (validSigners.length === 0) {
      alert('Please add at least one signer');
      return;
    }

    setActionLoading('create');
    try {
      const res = await fetch(`${DOCUMENTS_SERVICE_URL}/api/v1/envelopes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          signers: validSigners.map((s, i) => ({
            email: s.email,
            name: s.name,
            signingOrder: signingOrder === 'sequential' ? i + 1 : 1,
          })),
          signingOrder,
          emailMessage: emailMessage || undefined,
          autoDetectMarkers: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowNewEnvelope(false);
        setSigners([{ email: '', name: '' }]);
        setEmailMessage('');
        // Refresh envelopes
        const envRes = await fetch(
          `${DOCUMENTS_SERVICE_URL}/api/v1/envelopes/document/${documentId}`
        );
        if (envRes.ok) {
          const envData = await envRes.json();
          setEnvelopes(envData.data || []);
          if (envData.data?.[0]) {
            await fetchEnvelopeDetails(envData.data[0].id);
          }
        }
      } else {
        alert(data.message || 'Failed to create envelope');
      }
    } catch (err) {
      alert('Failed to create envelope');
    } finally {
      setActionLoading(null);
    }
  };

  const addSigner = () => {
    setSigners([...signers, { email: '', name: '' }]);
  };

  const updateSigner = (index: number, field: 'email' | 'name', value: string) => {
    const updated = [...signers];
    updated[index][field] = value;
    setSigners(updated);
  };

  const removeSigner = (index: number) => {
    if (signers.length > 1) {
      setSigners(signers.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !document) {
    return <ErrorState message={error || 'Document not found'} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{document.name}</h1>
            <Badge variant="secondary" className="capitalize">
              {document.type}
            </Badge>
          </div>
          {document.description && (
            <p className="text-muted-foreground mt-1">{document.description}</p>
          )}
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Document Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg bg-white overflow-hidden">
              {documentPreviewUrl ? (
                <iframe
                  src={documentPreviewUrl}
                  className="w-full h-[600px]"
                  title="Document Preview"
                />
              ) : (
                <div className="w-full h-[600px] flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Signature Management */}
        <div className="space-y-6">
          {/* Create New Envelope */}
          {envelopes.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Request Signatures
                </CardTitle>
                <CardDescription>
                  Send this document for electronic signatures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={showNewEnvelope} onOpenChange={setShowNewEnvelope}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Signers
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request Signatures</DialogTitle>
                      <DialogDescription>
                        Add signers who need to sign this document
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      {/* Signing Order */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Signing Order</label>
                        <Select
                          value={signingOrder}
                          onValueChange={(v) => setSigningOrder(v as 'parallel' | 'sequential')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="parallel">
                              All signers at once (parallel)
                            </SelectItem>
                            <SelectItem value="sequential">
                              One at a time (sequential)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Signers */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Signers</label>
                        {signers.map((signer, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="Name"
                              value={signer.name}
                              onChange={(e) => updateSigner(index, 'name', e.target.value)}
                            />
                            <Input
                              placeholder="Email"
                              type="email"
                              value={signer.email}
                              onChange={(e) => updateSigner(index, 'email', e.target.value)}
                            />
                            {signers.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSigner(index)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addSigner}>
                          <Plus className="mr-2 h-3 w-3" />
                          Add Another Signer
                        </Button>
                      </div>

                      {/* Message */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Message (optional)
                        </label>
                        <Input
                          placeholder="Add a message for signers..."
                          value={emailMessage}
                          onChange={(e) => setEmailMessage(e.target.value)}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowNewEnvelope(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateEnvelope}
                        disabled={actionLoading === 'create'}
                      >
                        {actionLoading === 'create' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create & Send Later'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Envelope Status */}
          {selectedEnvelope && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Signature Status
                  </CardTitle>
                  <Badge variant={statusColors[selectedEnvelope.envelope.status]}>
                    {selectedEnvelope.envelope.status}
                  </Badge>
                </div>
                <CardDescription>
                  {selectedEnvelope.envelope.signingOrder === 'sequential'
                    ? 'Sequential signing'
                    : 'Parallel signing'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Signers List */}
                {selectedEnvelope.signatures.map((sig, index) => (
                  <div
                    key={sig.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          sig.status === 'signed'
                            ? 'bg-green-100 text-green-700'
                            : sig.status === 'declined'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{sig.signerName || sig.signerEmail}</p>
                        <p className="text-sm text-muted-foreground">{sig.signerEmail}</p>
                      </div>
                    </div>
                    <Badge variant={statusColors[sig.status]} className="flex items-center gap-1">
                      {statusIcons[sig.status]}
                      {sig.status}
                    </Badge>
                  </div>
                ))}

                {/* Timeline */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Timeline</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Created: {formatDate(selectedEnvelope.envelope.createdAt)}</p>
                    {selectedEnvelope.envelope.sentAt && (
                      <p>Sent: {formatDate(selectedEnvelope.envelope.sentAt)}</p>
                    )}
                    {selectedEnvelope.envelope.completedAt && (
                      <p>Completed: {formatDate(selectedEnvelope.envelope.completedAt)}</p>
                    )}
                    {selectedEnvelope.envelope.expiresAt && (
                      <p>Expires: {formatDate(selectedEnvelope.envelope.expiresAt)}</p>
                    )}
                  </div>
                </div>
              </CardContent>

              {/* Actions */}
              <CardFooter className="flex flex-wrap gap-2">
                {selectedEnvelope.envelope.status === 'draft' && (
                  <Button
                    onClick={() => handleSendEnvelope(selectedEnvelope.envelope.id)}
                    disabled={actionLoading === `send-${selectedEnvelope.envelope.id}`}
                  >
                    {actionLoading === `send-${selectedEnvelope.envelope.id}` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send to Signers
                  </Button>
                )}

                {(selectedEnvelope.envelope.status === 'sent' ||
                  selectedEnvelope.envelope.status === 'in_progress') && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleSendReminders(selectedEnvelope.envelope.id)}
                      disabled={actionLoading === `remind-${selectedEnvelope.envelope.id}`}
                    >
                      {actionLoading === `remind-${selectedEnvelope.envelope.id}` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Bell className="mr-2 h-4 w-4" />
                      )}
                      Send Reminders
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleVoidEnvelope(selectedEnvelope.envelope.id)}
                      disabled={actionLoading === `void-${selectedEnvelope.envelope.id}`}
                    >
                      {actionLoading === `void-${selectedEnvelope.envelope.id}` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Void
                    </Button>
                  </>
                )}

                {selectedEnvelope.envelope.status === 'completed' && (
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadSigned(selectedEnvelope.envelope.id)}
                    disabled={actionLoading === `download-${selectedEnvelope.envelope.id}`}
                  >
                    {actionLoading === `download-${selectedEnvelope.envelope.id}` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download Signed
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchEnvelopeDetails(selectedEnvelope.envelope.id)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Voided Warning */}
          {selectedEnvelope?.envelope.status === 'voided' && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="font-medium">This envelope has been voided</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
