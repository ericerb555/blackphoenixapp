import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Check, X, MessageSquare, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  useContentManagement,
  ContentPiece,
  ContentWorkflow,
  ContentApproval,
} from '../lib/useContentManagement';
import { useAuth } from '../contexts/AuthContext';

interface ContentApprovalWorkflowProps {
  contentPiece: ContentPiece;
  onStatusChange?: () => void;
}

export function ContentApprovalWorkflow({ contentPiece, onStatusChange }: ContentApprovalWorkflowProps) {
  const { user } = useAuth();
  const {
    fetchWorkflows,
    fetchApprovals,
    updateApproval,
    updateContentPiece,
    createApproval,
  } = useContentManagement();

  const [workflow, setWorkflow] = useState<ContentWorkflow | null>(null);
  const [approvals, setApprovals] = useState<ContentApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);

  useEffect(() => {
    loadWorkflowData();
  }, [contentPiece.id]);

  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      // Fetch workflow
      const workflows = await fetchWorkflows();
      const contentWorkflow = workflows.find(w => w.id === contentPiece.workflow_id);
      setWorkflow(contentWorkflow || null);

      // Fetch approvals
      const approvalsData = await fetchApprovals(contentPiece.id);
      setApprovals(approvalsData);

      // If no approvals exist and workflow is assigned, create initial approval
      if (approvalsData.length === 0 && contentWorkflow) {
        await createInitialApprovals(contentWorkflow);
      }
    } catch (error) {
      console.error('Error loading workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInitialApprovals = async (workflow: ContentWorkflow) => {
    try {
      const stages = workflow.stages as any[];
      
      for (const stage of stages) {
        await createApproval({
          content_piece_id: contentPiece.id,
          workflow_stage: stage.stage,
          assigned_role: stage.required_role,
          status: 'pending',
        });
      }

      // Reload approvals
      const approvalsData = await fetchApprovals(contentPiece.id);
      setApprovals(approvalsData);
    } catch (error) {
      console.error('Error creating initial approvals:', error);
    }
  };

  const handleApprove = async (approvalId: string, stage: number) => {
    setActionLoading(true);
    try {
      // Update approval status
      await updateApproval(approvalId, {
        status: 'approved',
        decision: 'approved',
        comments,
      });

      // Check if this is the last stage
      const stages = workflow?.stages as any[] || [];
      const isLastStage = stage === stages.length;

      if (isLastStage) {
        // Mark content as approved
        await updateContentPiece(contentPiece.id, {
          status: 'approved',
          current_workflow_stage: stage,
        });
      } else {
        // Move to next stage
        await updateContentPiece(contentPiece.id, {
          current_workflow_stage: stage,
        });
      }

      setComments('');
      setShowCommentBox(false);
      
      if (onStatusChange) {
        onStatusChange();
      }

      // Reload workflow data
      await loadWorkflowData();
    } catch (error) {
      console.error('Error approving content:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (approvalId: string) => {
    setActionLoading(true);
    try {
      await updateApproval(approvalId, {
        status: 'rejected',
        decision: 'rejected',
        comments,
      });

      await updateContentPiece(contentPiece.id, {
        status: 'rejected',
      });

      setComments('');
      setShowCommentBox(false);
      
      if (onStatusChange) {
        onStatusChange();
      }

      await loadWorkflowData();
    } catch (error) {
      console.error('Error rejecting content:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async (approvalId: string) => {
    setActionLoading(true);
    try {
      await updateApproval(approvalId, {
        status: 'changes_requested',
        decision: 'changes_requested',
        comments,
      });

      await updateContentPiece(contentPiece.id, {
        status: 'draft',
      });

      setComments('');
      setShowCommentBox(false);
      
      if (onStatusChange) {
        onStatusChange();
      }

      await loadWorkflowData();
    } catch (error) {
      console.error('Error requesting changes:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const canUserApprove = (approval: ContentApproval): boolean => {
    // Check if user has the required role
    // This is a simplified check - in production, you'd check actual user roles
    return approval.status === 'pending' && contentPiece.status === 'pending_review';
  };

  const getStageStatus = (stage: number): 'pending' | 'approved' | 'rejected' | 'current' => {
    const approval = approvals.find(a => a.workflow_stage === stage);
    
    if (!approval) return 'pending';
    if (approval.status === 'approved') return 'approved';
    if (approval.status === 'rejected') return 'rejected';
    if (contentPiece.current_workflow_stage === stage - 1) return 'current';
    
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <X className="h-5 w-5 text-red-500" />;
      case 'current':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'current':
        return <Badge variant="default">In Review</Badge>;
      case 'changes_requested':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Changes Requested</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading workflow...</div>
      </Card>
    );
  }

  if (!workflow) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          No approval workflow assigned to this content
        </div>
      </Card>
    );
  }

  const stages = workflow.stages as any[];

  return (
    <div className="space-y-6">
      {/* Workflow Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{workflow.name}</h3>
            <p className="text-sm text-muted-foreground">{workflow.description}</p>
          </div>
          <Badge variant="outline">{stages.length} Stages</Badge>
        </div>
      </Card>

      {/* Workflow Progress */}
      <Card className="p-6">
        <div className="space-y-6">
          {stages.map((stage, index) => {
            const approval = approvals.find(a => a.workflow_stage === stage.stage);
            const stageStatus = getStageStatus(stage.stage);
            const canApprove = approval ? canUserApprove(approval) : false;

            return (
              <div key={stage.stage} className="space-y-4">
                {/* Stage Header */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(stageStatus)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">
                          Stage {stage.stage}: {stage.name}
                        </h4>
                        {stage.description && (
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        )}
                      </div>
                      {approval && getStatusBadge(approval.status)}
                    </div>

                    {/* Approval Details */}
                    {approval && approval.reviewed_at && (
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>Reviewed on {new Date(approval.reviewed_at).toLocaleDateString()}</span>
                        </div>
                        {approval.comments && (
                          <p className="text-sm mt-2">{approval.comments}</p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {canApprove && (
                      <div className="mt-4 space-y-3">
                        {showCommentBox ? (
                          <div className="space-y-3">
                            <Textarea
                              value={comments}
                              onChange={(e) => setComments(e.target.value)}
                              placeholder="Add your comments (optional)"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => approval && handleApprove(approval.id, stage.stage)}
                                disabled={actionLoading}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approval && handleRequestChanges(approval.id)}
                                disabled={actionLoading}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Request Changes
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => approval && handleReject(approval.id)}
                                disabled={actionLoading}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setShowCommentBox(false);
                                  setComments('');
                                }}
                                disabled={actionLoading}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCommentBox(true)}
                          >
                            Review This Stage
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < stages.length - 1 && (
                  <div className="ml-2.5 h-8 w-0.5 bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Overall Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold mb-1">Overall Status</h4>
            <p className="text-sm text-muted-foreground">
              Current progress: Stage {contentPiece.current_workflow_stage + 1} of {stages.length}
            </p>
          </div>
          <div className="text-right">
            {contentPiece.status === 'approved' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Approved</span>
              </div>
            )}
            {contentPiece.status === 'rejected' && (
              <div className="flex items-center gap-2 text-red-600">
                <X className="h-5 w-5" />
                <span className="font-semibold">Rejected</span>
              </div>
            )}
            {contentPiece.status === 'pending_review' && (
              <div className="flex items-center gap-2 text-blue-600">
                <Clock className="h-5 w-5" />
                <span className="font-semibold">Under Review</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
