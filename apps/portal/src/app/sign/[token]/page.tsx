'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SignaturePad, SignaturePadRef } from '@/components/signature-pad';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  XCircle,
  PenLine,
  Type,
  Calendar,
} from 'lucide-react';

const DOCUMENTS_SERVICE_URL = process.env.NEXT_PUBLIC_DOCUMENTS_SERVICE_URL || 'http://localhost:3005';

interface SignatureField {
  id: string;
  type: 'signature' | 'initials' | 'date' | 'text';
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  markerText: string | null;
  isRequired: boolean;
  completed: boolean;
}

interface SigningInfo {
  signatureId: string;
  documentId: string;
  documentName: string;
  documentUrl: string;
  signerName: string;
  signerEmail: string;
  message: string | null;
  status: string;
  fields: SignatureField[];
}

type PageState = 'loading' | 'ready' | 'signing' | 'success' | 'declined' | 'error';

interface FieldValue {
  fieldId: string;
  type: string;
  value: string;
}

const fieldTypeIcons: Record<string, React.ReactNode> = {
  signature: <PenLine className="h-4 w-4" />,
  initials: <Type className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
};

const fieldTypeLabels: Record<string, string> = {
  signature: 'Signature',
  initials: 'Initials',
  date: 'Date',
  text: 'Text',
};

export default function SigningPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [signingInfo, setSigningInfo] = useState<SigningInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // Field values state
  const [fieldValues, setFieldValues] = useState<Map<string, FieldValue>>(new Map());
  const [activeField, setActiveField] = useState<SignatureField | null>(null);
  const [showFieldDialog, setShowFieldDialog] = useState(false);

  // Signature pad for fields
  const fieldSignaturePadRef = useRef<SignaturePadRef>(null);

  // Check if all required fields are completed
  const allRequiredFieldsCompleted = useCallback(() => {
    if (!signingInfo?.fields || signingInfo.fields.length === 0) {
      // No fields - use legacy signature flow
      return true;
    }
    const requiredFields = signingInfo.fields.filter((f) => f.isRequired);
    return requiredFields.every((f) => fieldValues.has(f.id));
  }, [signingInfo, fieldValues]);

  // Fetch signing info
  useEffect(() => {
    async function fetchSigningInfo() {
      try {
        const response = await fetch(`${DOCUMENTS_SERVICE_URL}/sign/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Invalid or expired signing link');
          setState('error');
          return;
        }

        setSigningInfo(data.data);
        setState('ready');
      } catch (err) {
        setError('Failed to load signing information');
        setState('error');
      }
    }

    fetchSigningInfo();
  }, [token]);

  const handleFieldClick = (field: SignatureField) => {
    setActiveField(field);
    setShowFieldDialog(true);
  };

  const handleFieldComplete = () => {
    if (!activeField) return;

    let value = '';

    if (activeField.type === 'signature' || activeField.type === 'initials') {
      if (!fieldSignaturePadRef.current || fieldSignaturePadRef.current.isEmpty()) {
        return;
      }
      value = fieldSignaturePadRef.current.toDataURL();
    } else if (activeField.type === 'date') {
      value = new Date().toLocaleDateString();
    }

    setFieldValues((prev) => {
      const next = new Map(prev);
      next.set(activeField.id, {
        fieldId: activeField.id,
        type: activeField.type,
        value,
      });
      return next;
    });

    setShowFieldDialog(false);
    setActiveField(null);
  };

  const handleSubmit = async () => {
    if (!allRequiredFieldsCompleted() || !agreedToTerms) {
      return;
    }

    setIsSubmitting(true);

    try {
      // For documents with fields, we send field values
      // For legacy documents without fields, we use the primary signature
      let signatureImage = '';

      if (signingInfo?.fields && signingInfo.fields.length > 0) {
        // Get the first signature field value as the primary signature
        const signatureField = signingInfo.fields.find((f) => f.type === 'signature');
        if (signatureField) {
          const fieldValue = fieldValues.get(signatureField.id);
          signatureImage = fieldValue?.value || '';
        }
      }

      const response = await fetch(`${DOCUMENTS_SERVICE_URL}/sign/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureImage,
          fields: Array.from(fieldValues.values()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to submit signature');
        setState('error');
        return;
      }

      setRedirectUrl(data.data?.redirectUrl);
      setState('success');
    } catch (err) {
      setError('Failed to submit signature');
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline signing this document?')) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${DOCUMENTS_SERVICE_URL}/sign/${token}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to decline signature');
        setState('error');
        return;
      }

      setState('declined');
    } catch (err) {
      setError('Failed to decline signature');
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading document...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Unable to Load</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <CardTitle>Document Signed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Thank you! The document has been signed successfully. The document owner will receive a notification.
            </p>
          </CardContent>
          {redirectUrl && (
            <CardFooter>
              <Button onClick={() => router.push(redirectUrl)}>
                Continue
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    );
  }

  // Declined state
  if (state === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <XCircle className="h-6 w-6 text-muted-foreground" />
              <CardTitle>Signature Declined</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You have declined to sign this document. The document owner has been notified.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasFields = signingInfo?.fields && signingInfo.fields.length > 0;
  const completedFieldCount = fieldValues.size;
  const requiredFieldCount = signingInfo?.fields?.filter((f) => f.isRequired).length || 0;

  // Ready state - show signing form
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start space-x-4">
              <FileText className="h-8 w-8 text-primary mt-1" />
              <div className="flex-1">
                <CardTitle>{signingInfo?.documentName}</CardTitle>
                <CardDescription className="mt-1">
                  You have been requested to sign this document
                </CardDescription>
              </div>
              {hasFields && (
                <Badge variant={allRequiredFieldsCompleted() ? 'success' : 'secondary'}>
                  {completedFieldCount} / {requiredFieldCount} fields completed
                </Badge>
              )}
            </div>
          </CardHeader>
          {signingInfo?.message && (
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground italic">
                  &ldquo;{signingInfo.message}&rdquo;
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Document Preview with Field Overlays */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Document</CardTitle>
              {hasFields && (
                <CardDescription>
                  Click on the highlighted fields to complete them
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="relative border rounded-lg bg-white overflow-hidden">
                <iframe
                  src={signingInfo?.documentUrl}
                  className="w-full h-[600px]"
                  title="Document Preview"
                />

                {/* Field Overlays */}
                {hasFields && (
                  <div className="absolute inset-0 pointer-events-none">
                    {signingInfo?.fields.map((field) => {
                      const isCompleted = fieldValues.has(field.id);
                      // Scale positions relative to the iframe dimensions
                      // This is a simplified approach - real implementation would need
                      // to sync with PDF rendering
                      const style: React.CSSProperties = {
                        position: 'absolute',
                        left: `${(field.x / 612) * 100}%`,
                        top: `${(1 - field.y / 792) * 100}%`,
                        width: `${(field.width / 612) * 100}%`,
                        height: `${(field.height / 792) * 100}%`,
                        pointerEvents: 'auto',
                      };

                      return (
                        <button
                          key={field.id}
                          style={style}
                          onClick={() => handleFieldClick(field)}
                          className={`
                            border-2 rounded transition-all cursor-pointer
                            ${isCompleted
                              ? 'border-green-500 bg-green-50/50'
                              : 'border-primary bg-primary/10 hover:bg-primary/20 animate-pulse'}
                          `}
                          title={`${fieldTypeLabels[field.type]}${field.isRequired ? ' (Required)' : ''}`}
                        >
                          <div className="flex items-center justify-center h-full gap-1 text-xs">
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <>
                                {fieldTypeIcons[field.type]}
                                <span className="hidden sm:inline">
                                  {fieldTypeLabels[field.type]}
                                </span>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Signature Section */}
          <div className="space-y-6">
            {/* Field List */}
            {hasFields && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Fields to Complete</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {signingInfo?.fields.map((field) => {
                    const isCompleted = fieldValues.has(field.id);
                    return (
                      <button
                        key={field.id}
                        onClick={() => handleFieldClick(field)}
                        className={`
                          w-full flex items-center justify-between p-3 rounded-lg border
                          transition-colors text-left
                          ${isCompleted
                            ? 'border-green-500 bg-green-50'
                            : 'border-border hover:border-primary hover:bg-accent'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          {fieldTypeIcons[field.type]}
                          <span className="font-medium">{fieldTypeLabels[field.type]}</span>
                          {field.isRequired && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <span className="text-sm text-muted-foreground">Click to fill</span>
                        )}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Agreement and Submit */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Complete Signing</CardTitle>
                <CardDescription>
                  Signing as {signingInfo?.signerName} ({signingInfo?.signerEmail})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                  >
                    I agree that my electronic signature is the legal equivalent of my manual signature.
                    By signing, I agree to be legally bound by this document.
                  </label>
                </div>

                {!allRequiredFieldsCompleted() && hasFields && (
                  <p className="text-sm text-amber-600">
                    Please complete all required fields before signing.
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={isSubmitting}
                >
                  Decline to Sign
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!allRequiredFieldsCompleted() || !agreedToTerms || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    'Sign Document'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Powered by tenxdev.ai E-Signature</p>
        </div>
      </div>

      {/* Field Completion Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeField && fieldTypeIcons[activeField.type]}
              {activeField && fieldTypeLabels[activeField.type]}
            </DialogTitle>
            <DialogDescription>
              {activeField?.type === 'signature' && 'Draw your signature below'}
              {activeField?.type === 'initials' && 'Draw your initials below'}
              {activeField?.type === 'date' && 'Click confirm to add today\'s date'}
              {activeField?.type === 'text' && 'Enter your text below'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {(activeField?.type === 'signature' || activeField?.type === 'initials') && (
              <SignaturePad
                ref={fieldSignaturePadRef}
                onSignatureChange={() => {}}
              />
            )}

            {activeField?.type === 'date' && (
              <div className="text-center py-8">
                <p className="text-2xl font-medium">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFieldDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleFieldComplete}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
