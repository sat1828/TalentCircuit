import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Sparkles, Loader2, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      toast.error('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      <div className="floating-orb w-96 h-96 bg-purple-500 top-[-10%] left-[-5%]" />
      <div className="floating-orb w-80 h-80 bg-indigo-500 bottom-[-8%] right-[-5%]" style={{ animationDelay: '-4s' }} />
      <div className="floating-orb w-64 h-64 bg-pink-500 top-[40%] right-[-3%]" style={{ animationDelay: '-8s' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)' }}>
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold shimmer-text">Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Sign in to TalentCircuit</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input pr-10"
                placeholder="Enter your password"
                required
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Briefcase className="w-4 h-4 mr-2" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-5 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold" style={{ color: '#6366f1' }}>
            Create one
          </Link>
        </p>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowDemo(!showDemo)}
            className="btn-ghost btn-sm text-xs"
          >
            {showDemo ? 'Hide' : 'Show'} demo accounts
          </button>
          {showDemo && (
            <div className="mt-3 glass rounded-xl p-4 text-xs text-left space-y-1.5" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Demo accounts:</p>
              <p><span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>Admin:</span> admin@talentcircuit.com / admin123</p>
              <p><span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>Manager:</span> manager@talentcircuit.com / admin123</p>
              <p><span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>Employee:</span> priya@talentcircuit.com / user123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
