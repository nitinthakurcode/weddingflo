'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ZoomIn, ZoomOut, Download, Printer } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface TimelineControlsProps {
  startHour: number;
  endHour: number;
  onStartHourChange: (hour: number) => void;
  onEndHourChange: (hour: number) => void;
  onZoomChange: (zoom: 'hour' | 'half_hour' | 'quarter_hour') => void;
  currentZoom: 'hour' | 'half_hour' | 'quarter_hour';
}

const hours = Array.from({ length: 24 }, (_, i) => i);

export function TimelineControls({
  startHour,
  endHour,
  onStartHourChange,
  onEndHourChange,
  onZoomChange,
  currentZoom,
}: TimelineControlsProps) {
  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log('Exporting to PDF...');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Time Range */}
        <div className="flex items-center gap-3">
          <Label htmlFor="start-hour" className="text-sm font-medium">
            Time Range:
          </Label>
          <Select
            value={startHour.toString()}
            onValueChange={(v) => onStartHourChange(Number(v))}
          >
            <SelectTrigger id="start-hour" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hours.map((h) => (
                <SelectItem key={h} value={h.toString()}>
                  {h.toString().padStart(2, '0')}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-gray-500">to</span>
          <Select
            value={endHour.toString()}
            onValueChange={(v) => onEndHourChange(Number(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hours.map((h) => (
                <SelectItem key={h} value={h.toString()} disabled={h <= startHour}>
                  {h.toString().padStart(2, '0')}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Zoom:</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onZoomChange('hour')}
            className={currentZoom === 'hour' ? 'bg-primary/5' : ''}
          >
            <ZoomOut className="h-4 w-4 mr-1" />
            1h
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onZoomChange('half_hour')}
            className={currentZoom === 'half_hour' ? 'bg-primary/5' : ''}
          >
            30m
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onZoomChange('quarter_hour')}
            className={currentZoom === 'quarter_hour' ? 'bg-primary/5' : ''}
          >
            <ZoomIn className="h-4 w-4 mr-1" />
            15m
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* Export Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </div>
    </Card>
  );
}
