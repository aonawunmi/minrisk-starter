import React, { useState } from 'react';
import { ReportsList } from './ReportsList';
import { ReportComposer } from './ReportComposer';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';

interface ReportsContainerProps {
  organizationId: string;
  userId: string;
  userEmail: string;
  userRole: 'admin' | 'edit' | 'view_only';
}

type ViewMode = 'list' | 'report';

export function ReportsContainer({ organizationId, userId, userEmail, userRole }: ReportsContainerProps) {
  console.log('🎯🎯🎯 ReportsContainer is loading! This is the NEW code! 🎯🎯🎯');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  function handleCreateNew() {
    setViewMode('report');
    setSelectedReportId(null);
  }

  function handleOpenReport(reportId: string) {
    setSelectedReportId(reportId);
    setViewMode('report');
  }

  function handleBackToList() {
    setViewMode('list');
    setSelectedReportId(null);
  }

  return (
    <div className="relative">
      {/* Back button - only show when not in list view */}
      {viewMode !== 'list' && (
        <div className="absolute top-4 left-4 z-10">
          <Button
            onClick={handleBackToList}
            variant="outline"
            className="bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'list' && (
        <ReportsList
          organizationId={organizationId}
          userId={userId}
          onCreateNew={handleCreateNew}
          onOpenReport={handleOpenReport}
        />
      )}

      {viewMode === 'report' && (
        <div className="pt-16">
          <ReportComposer
            organizationId={organizationId}
            userId={userId}
            userEmail={userEmail}
            userRole={userRole}
            reportId={selectedReportId || undefined}
          />
        </div>
      )}
    </div>
  );
}
