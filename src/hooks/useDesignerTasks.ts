import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DesignTask {
  id: string;
  project_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  client_name: string | null;
  project_name: string | null;
  status: string;
  priority: string;
  reward_level: string | null;
  client_type: string | null;
  deadline: string | null;
  started_at: string | null;
  completed_at: string | null;
  design_count: number | null;
  designs_completed: number | null;
  created_at: string;
  updated_at: string;
}

export interface DesignDelivery {
  id: string;
  design_task_id: string;
  designer_id: string;
  version_number: number;
  delivery_type: string;
  file_path: string | null;
  external_link: string | null;
  link_type: string | null;
  notes: string | null;
  submitted_at: string;
  created_at: string;
}

export function useDesignerTasks() {
  const { user } = useAuth();

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['designer-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('design_tasks')
        .select('*')
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching design tasks:', error);
        throw error;
      }

      return data as DesignTask[];
    },
    enabled: !!user?.id,
  });

  // Calculate stats from tasks
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'new' || t.status === 'active').length,
    inRevision: tasks.filter(t => t.status === 'revision_requested').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return { tasks, stats, isLoading, refetch };
}

export function useStartDesignTask() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('design_tasks')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designer-tasks'] });
    },
  });

  return { startTask: mutation.mutateAsync };
}

export function useSubmitDesignDelivery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({
      taskId,
      deliveryType,
      filePath,
      externalLink,
      linkType,
      notes,
    }: {
      taskId: string;
      deliveryType: 'file' | 'link';
      filePath?: string;
      externalLink?: string;
      linkType?: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get next version number
      const { data: existingDeliveries } = await supabase
        .from('design_deliveries')
        .select('version_number')
        .eq('design_task_id', taskId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = existingDeliveries && existingDeliveries.length > 0
        ? existingDeliveries[0].version_number + 1
        : 1;

      // Create delivery
      const { data: delivery, error: deliveryError } = await supabase
        .from('design_deliveries')
        .insert({
          design_task_id: taskId,
          designer_id: user.id,
          delivery_type: deliveryType,
          file_path: filePath,
          external_link: externalLink,
          link_type: linkType,
          notes: notes,
          version_number: nextVersion,
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // Update task status
      const { error: taskError } = await supabase
        .from('design_tasks')
        .update({
          status: 'in_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      return delivery;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designer-tasks'] });
    },
  });

  return { submitDelivery: mutation.mutateAsync, isSubmitting: mutation.isPending };
}

export function useDesignDeliveries(taskId: string | undefined) {
  return useQuery({
    queryKey: ['design-deliveries', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('design_deliveries')
        .select('*')
        .eq('design_task_id', taskId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return data as DesignDelivery[];
    },
    enabled: !!taskId,
  });
}

export function useDeleteDesignTask() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (taskId: string) => {
      // First delete related deliveries
      const { error: deliveriesError } = await supabase
        .from('design_deliveries')
        .delete()
        .eq('design_task_id', taskId);

      if (deliveriesError) {
        console.error('Error deleting deliveries:', deliveriesError);
      }

      // Delete the task
      const { error } = await supabase
        .from('design_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designer-tasks'] });
    },
  });

  return { deleteTask: mutation.mutateAsync, isDeleting: mutation.isPending };
}
