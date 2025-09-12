import { withAuthenticationRequired } from '@auth0/auth0-react';
import { ComponentType } from 'react';

interface ProtectedRouteProps {
  component: ComponentType;
}

export const ProtectedRoute = ({ component }: ProtectedRouteProps) => {
  const Component = withAuthenticationRequired(component, {
    onRedirecting: () => (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    ),
  });

  return <Component />;
};