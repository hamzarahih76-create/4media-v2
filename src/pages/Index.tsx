import { RoleBasedRedirect } from '@/components/layout/ProtectedRoute';

const Index = () => {
  // RoleBasedRedirect handles:
  // - If not logged in -> /auth
  // - If admin -> /pm
  // - If editor -> /editor
  // - Based on permissions for other roles
  return <RoleBasedRedirect />;
};

export default Index;
