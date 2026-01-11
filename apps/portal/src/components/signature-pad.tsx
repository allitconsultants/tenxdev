'use client';

import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SignaturePadRef {
  isEmpty: () => boolean;
  clear: () => void;
  toDataURL: () => string;
}

interface SignaturePadProps {
  onSignatureChange?: (isEmpty: boolean) => void;
  className?: string;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  function SignaturePad({ onSignatureChange, className }, ref) {
    const sigCanvas = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      isEmpty: () => sigCanvas.current?.isEmpty() ?? true,
      clear: () => {
        sigCanvas.current?.clear();
        onSignatureChange?.(true);
      },
      toDataURL: () => sigCanvas.current?.toDataURL('image/png') ?? '',
    }));

    const handleClear = () => {
      sigCanvas.current?.clear();
      onSignatureChange?.(true);
    };

    const handleEnd = () => {
      const isEmpty = sigCanvas.current?.isEmpty() ?? true;
      onSignatureChange?.(isEmpty);
    };

    useEffect(() => {
      // Resize handler for responsive canvas
      const handleResize = () => {
        const canvas = sigCanvas.current?.getCanvas();
        if (canvas) {
          // Store current data
          const data = sigCanvas.current?.toData();

          // Resize
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width * ratio;
          canvas.height = rect.height * ratio;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(ratio, ratio);
          }

          // Restore data
          if (data) {
            sigCanvas.current?.fromData(data);
          }
        }
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
      <div className={cn('space-y-2', className)}>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-white overflow-hidden">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: 'w-full h-48 cursor-crosshair touch-none',
            }}
            backgroundColor="rgb(255, 255, 255)"
            penColor="rgb(0, 0, 0)"
            onEnd={handleEnd}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Sign above using your mouse or finger
          </p>
          <Button variant="outline" size="sm" onClick={handleClear} type="button">
            Clear
          </Button>
        </div>
      </div>
    );
  }
);
