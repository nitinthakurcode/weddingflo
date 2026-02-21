'use client'

/**
 * Confirmation Dialog Component
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Modal dialog for confirming mutations with:
 * - Preview display with field changes
 * - Cascade effects visualization
 * - Confirm/Cancel buttons
 * - Loading state during execution
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  XCircle,
} from 'lucide-react'
import type { ToolPreview } from '../server/services/tool-executor'

// ============================================
// TYPES
// ============================================

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  preview: ToolPreview
  isLoading?: boolean
}

// ============================================
// COMPONENT
// ============================================

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  preview,
  isLoading = false,
}: ConfirmationDialogProps) {
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setError(null)
    try {
      await onConfirm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to execute action')
    }
  }

  // Get icon based on action type
  const getActionIcon = () => {
    const toolName = preview.toolName

    if (toolName.startsWith('create_') || toolName.startsWith('add_')) {
      return <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
      </div>
    }

    if (toolName.startsWith('update_')) {
      return <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
        <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
    }

    if (toolName.startsWith('delete_')) {
      return <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
      </div>
    }

    return <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
      <Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-400" />
    </div>
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getActionIcon()}
            <div>
              <DialogTitle className="text-lg">
                Confirm Action
              </DialogTitle>
              <DialogDescription className="text-sm">
                {preview.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Field Changes */}
        <div className="py-4">
          <div className="text-xs uppercase tracking-wide text-mocha-500 mb-2">
            Changes
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {preview.fields.map((field) => (
              <div
                key={field.name}
                className="flex items-center justify-between py-2 px-3 bg-cloud-50 dark:bg-mocha-800/50 rounded-lg"
              >
                <span className="text-sm text-mocha-600 dark:text-mocha-400 capitalize">
                  {field.name.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-medium text-mocha-900 dark:text-mocha-100">
                  {field.displayValue}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cascade Effects */}
        {preview.cascadeEffects.length > 0 && (
          <div className="py-3 px-4 bg-gold-50 dark:bg-gold-900/20 rounded-lg border border-gold-200 dark:border-gold-800">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-gold-600 dark:text-gold-400" />
              <span className="text-sm font-medium text-gold-800 dark:text-gold-200">
                This will also create:
              </span>
            </div>
            <ul className="space-y-1.5">
              {preview.cascadeEffects.map((effect, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gold-700 dark:text-gold-300"
                >
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-gold-500 flex-shrink-0" />
                  <span>{effect}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {preview.warnings.length > 0 && (
          <div className="py-3 px-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Warnings
              </span>
            </div>
            <ul className="space-y-1.5">
              {preview.warnings.map((warning, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300"
                >
                  <span className="text-amber-500">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="py-3 px-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">
                {error}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmationDialog
