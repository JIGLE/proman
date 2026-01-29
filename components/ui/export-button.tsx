"use client";

import { useState } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { cn } from '@/lib/utils';

export interface ExportButtonProps<T> {
  data: T[];
  filename: string;
  columns: {
    key: keyof T;
    label: string;
    format?: (value: any) => string;
  }[];
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportButton<T>({
  data,
  filename,
  columns,
  disabled = false,
  className,
  variant = 'outline',
  size = 'default',
}: ExportButtonProps<T>): React.ReactElement {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      // Create CSV header
      const headers = columns.map(col => col.label).join(',');
      
      // Create CSV rows
      const rows = data.map(item => {
        return columns.map(col => {
          const value = item[col.key];
          const formatted = col.format ? col.format(value) : String(value ?? '');
          // Escape commas and quotes in CSV
          return `"${formatted.replace(/"/g, '""')}"`;
        }).join(',');
      });

      // Combine header and rows
      const csv = [headers, ...rows].join('\n');

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (data.length === 0) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled={true}
        className={cn('flex items-center gap-2', className)}
      >
        <Download className="w-4 h-4" />
        Export
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting}
          className={cn('flex items-center gap-2', className)}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} disabled={isExporting}>
          <FileDown className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
