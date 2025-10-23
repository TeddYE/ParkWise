import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ViewType, User } from '../types';
import { login } from '../services/authService';

interface LoginViewProps {
  onViewChange: (view: ViewType) => void;
  onLoginSuccess: (user: User) => void;
}

export function LoginView({ onViewChange, onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const response = await login({ email, password });
    
    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }
    
    if (response.user) {
      // Store user data
      localStorage.setItem('user', JSON.stringify(response.user));
      onLoginSuccess(response.user);
    }
    
    setLoading(false);
  };

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Button variant="outline" size="icon" onClick={() => onViewChange('map')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl">Sign In to ParkWise</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => onViewChange('signup')}
              >
                Sign up
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Button
            variant="link"
            className="text-sm text-muted-foreground"
            onClick={() => onViewChange('map')}
          >
            Continue without account
          </Button>
        </div>
      </div>
    </div>
  );
}
