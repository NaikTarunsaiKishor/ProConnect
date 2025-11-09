import { useAuth } from '@/lib/auth';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Briefcase, Home, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border backdrop-blur-sm bg-card/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-2.5 cursor-pointer group" 
              onClick={() => navigate('/')}
            >
              <div className="bg-primary p-2 rounded-lg group-hover:bg-primary-hover transition-colors shadow-md">
                <Briefcase className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ProConnect
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex flex-col items-center gap-1 h-auto py-2 px-4 hover:bg-secondary/80 transition-all"
              >
                <Home className="h-5 w-5" />
                <span className="text-xs font-medium">Home</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/profile/${user.id}`)}
                className="flex flex-col items-center gap-1 h-auto py-2 px-4 hover:bg-secondary/80 transition-all"
              >
                <User className="h-5 w-5" />
                <span className="text-xs font-medium">Profile</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:bg-secondary/80 px-3 py-2 rounded-lg transition-all"
              onClick={() => navigate(`/profile/${user.id}`)}
            >
              <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-none">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">View profile</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
